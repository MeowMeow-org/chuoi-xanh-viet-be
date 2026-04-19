import { randomBytes } from 'node:crypto'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateSaleUnitRequestBody } from './sale-unit.request'

const saleUnitSelect = {
  id: true,
  season_id: true,
  code: true,
  quantity: true,
  unit: true,
  qr_token: true,
  qr_url: true,
  short_code: true,
  status: true,
  created_at: true,
  product: {
    select: {
      id: true,
      is_active: true
    }
  }
} as const

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tránh chữ dễ nhầm: I/O/0/1

function randomShortCode(): string {
  const buf = randomBytes(6)
  let s = 'CXV-'
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[buf[i]! % ALPHABET.length]
  }
  return s
}

function randomQrToken(): string {
  return randomBytes(24).toString('hex') // 48 hex chars
}

/**
 * Quy đổi đơn vị sang "khoá" để so sánh không phân biệt hoa/thường & có/không khoảng trắng.
 */
function normalizeUnit(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function toNumber(decimalLike: { toString(): string } | null | undefined): number {
  if (decimalLike == null) return 0
  const n = Number(decimalLike.toString())
  return Number.isFinite(n) ? n : 0
}

/** Đơn vị lô bán cho phép (API lưu chuẩn: tấn | kg | g). */
type LotMassUnit = 'tấn' | 'kg' | 'g'

function canonicalLotUnit(raw: string | null | undefined): LotMassUnit | null {
  const n = normalizeUnit(raw)
  if (n === 'tấn' || n === 'tan') return 'tấn'
  if (n === 'kg') return 'kg'
  if (n === 'g' || n === 'gam' || n === 'gram') return 'g'
  return null
}

function kgPerLotUnit(c: LotMassUnit): number {
  if (c === 'tấn') return 1000
  if (c === 'kg') return 1
  return 0.001
}

function quantityLotToKg(qty: number, c: LotMassUnit): number {
  return qty * kgPerLotUnit(c)
}

/**
 * 1 đơn vị ghi sản lượng mùa vụ → bao nhiêu kg (chuẩn VN thông dụng).
 */
function seasonYieldUnitToKgPerUnit(seasonUnit: string): number | null {
  const n = normalizeUnit(seasonUnit)
  const map: Record<string, number> = {
    kg: 1,
    g: 0.001,
    gam: 0.001,
    gram: 0.001,
    'tấn': 1000,
    tan: 1000,
    yến: 10,
    yen: 10,
    tạ: 100,
    ta: 100
  }
  const v = map[n]
  return v == null ? null : v
}

/**
 * Quy đổi một dòng sale_units (legacy có thể là yến/tạ) sang kg.
 */
function saleRowToKg(quantity: number, unitRaw: string): number {
  const canon = canonicalLotUnit(unitRaw)
  if (canon != null) return quantityLotToKg(quantity, canon)
  const per = seasonYieldUnitToKgPerUnit(unitRaw)
  if (per != null) return quantity * per
  return quantity
}

class SaleUnitService {
  private async ensureOwnedAnchoredSeason(userId: string, seasonId: string) {
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        id: true,
        status: true,
        farm_id: true,
        code: true,
        actual_yield: true,
        yield_unit: true
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    if (season.status !== 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SALE_UNIT_SEASON_MUST_BE_ANCHORED
      })
    }

    const actualYield = toNumber(season.actual_yield)
    const unit = season.yield_unit?.trim() ?? ''
    if (actualYield <= 0 || unit.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SALE_UNIT_SEASON_MISSING_YIELD
      })
    }

    return season
  }

  /**
   * Tổng khối lượng đã phân bổ (active + sold), quy đổi về kg.
   */
  private async getAllocatedKg(seasonId: string): Promise<number> {
    const rows = await prisma.sale_units.findMany({
      where: {
        season_id: seasonId,
        status: { in: ['active', 'sold'] }
      },
      select: { quantity: true, unit: true }
    })
    let sum = 0
    for (const r of rows) {
      sum += saleRowToKg(toNumber(r.quantity), r.unit ?? '')
    }
    return sum
  }

  private async resolveShortCode(requested: string | undefined): Promise<string> {
    if (requested != null && requested.length > 0) {
      const exists = await prisma.sale_units.findUnique({
        where: { short_code: requested },
        select: { id: true }
      })
      if (exists != null) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.SEASON_CODE_ALREADY_EXISTS
        })
      }
      return requested
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      const code = randomShortCode()
      const dup = await prisma.sale_units.findUnique({
        where: { short_code: code },
        select: { id: true }
      })
      if (dup == null) return code
    }

    throw new ErrorWithStatus({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: USER_MESSAGES.SALE_UNIT_CODE_GENERATION_FAILED
    })
  }

  private async resolveUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const code = randomBytes(8).toString('hex').toUpperCase()
      const dup = await prisma.sale_units.findUnique({
        where: { code },
        select: { id: true }
      })
      if (dup == null) return code
    }
    throw new ErrorWithStatus({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: USER_MESSAGES.SALE_UNIT_CODE_GENERATION_FAILED
    })
  }

  private buildQrUrl(shortCode: string): string {
    const base = process.env.PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ?? 'http://localhost:3000'
    return `${base}/truy-xuat/${encodeURIComponent(shortCode)}`
  }

  createSaleUnit = async ({ userId, payload }: { userId: string; payload: CreateSaleUnitRequestBody }) => {
    const season = await this.ensureOwnedAnchoredSeason(userId, payload.seasonId)

    const lotUnit = canonicalLotUnit(payload.unit?.trim() ?? 'kg')
    if (lotUnit == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_LOT_UNIT_INVALID
      })
    }

    const requestedQty = Number(payload.quantity)
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_EXCEEDS_ACTUAL_YIELD
      })
    }

    const seasonYieldUnit = season.yield_unit!.trim()
    const kgPerSeasonUnit = seasonYieldUnitToKgPerUnit(seasonYieldUnit)
    if (kgPerSeasonUnit == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_SEASON_UNIT_NOT_CONVERTIBLE
      })
    }

    const actualYieldSeason = toNumber(season.actual_yield)
    const seasonTotalKg = actualYieldSeason * kgPerSeasonUnit
    const requestedKg = quantityLotToKg(requestedQty, lotUnit)
    const allocatedKg = await this.getAllocatedKg(season.id)

    if (allocatedKg + requestedKg > seasonTotalKg + 0.001) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_EXCEEDS_ACTUAL_YIELD
      })
    }

    const shortCode = await this.resolveShortCode(payload.shortCode)
    const code = await this.resolveUniqueCode()
    const qrToken = randomQrToken()
    const qrUrl = this.buildQrUrl(shortCode)

    const created = await prisma.sale_units.create({
      data: {
        season_id: payload.seasonId,
        code,
        quantity: requestedQty,
        unit: lotUnit,
        qr_token: qrToken,
        qr_url: qrUrl,
        short_code: shortCode,
        status: 'active'
      },
      select: saleUnitSelect
    })

    return created
  }

  listSaleUnits = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        id: true,
        status: true,
        actual_yield: true,
        yield_unit: true
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    const [items, allocatedKg] = await Promise.all([
      prisma.sale_units.findMany({
        where: { season_id: seasonId },
        orderBy: { created_at: 'desc' },
        select: saleUnitSelect
      }),
      this.getAllocatedKg(season.id)
    ])

    const actualYield = toNumber(season.actual_yield)
    const yu = season.yield_unit?.trim() ?? ''
    const kgPer = seasonYieldUnitToKgPerUnit(yu)
    if (kgPer == null && actualYield > 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_SEASON_UNIT_NOT_CONVERTIBLE
      })
    }
    const actualYieldKg = kgPer != null ? actualYield * kgPer : 0
    const remainingKg = Math.max(0, actualYieldKg - allocatedKg)

    return {
      items,
      totals: {
        actualYield,
        yieldUnit: season.yield_unit,
        actualYieldKg,
        allocatedKg,
        remainingKg
      }
    }
  }

  deleteSaleUnit = async ({ userId, saleUnitId }: { userId: string; saleUnitId: string }) => {
    const found = await prisma.sale_units.findFirst({
      where: {
        id: saleUnitId,
        seasons: {
          farms: {
            owner_user_id: userId
          }
        }
      },
      select: {
        id: true,
        _count: {
          select: { trace_scans: true }
        }
      }
    })

    if (found == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SALE_UNIT_NOT_FOUND
      })
    }

    // Nếu có scan rồi thì disable thay vì xoá cứng để giữ lịch sử truy xuất.
    if (found._count.trace_scans > 0) {
      await prisma.sale_units.update({
        where: { id: saleUnitId },
        data: { status: 'disabled' }
      })
      return
    }

    await prisma.sale_units.delete({ where: { id: saleUnitId } })
  }
}

const saleUnitService = new SaleUnitService()
export default saleUnitService
