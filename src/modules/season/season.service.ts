import { randomBytes } from 'node:crypto'

import { Prisma, type season_status } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { domainEvents, DomainEventName } from '~/events/domain-events'
import { sendAnchorTx } from '~/lib/blockchain'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import anchorService from '../anchor/anchor.service'
import type { CreateSeasonRequestBody, GetSeasonsQuery, UpdateSeasonRequestBody } from './season.request'

/** Năng suất mùa vụ lưu Decimal(12,2) — chuẩn hoá để tránh lệch kiểu 899.99 vs 900 do float JS. */
function toYieldDecimal2(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value)) return null
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

function toYieldDecimal2Required(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2)
}

const seasonSelect = {
  id: true,
  farm_id: true,
  code: true,
  crop_name: true,
  start_date: true,
  harvest_start_date: true,
  harvest_end_date: true,
  estimated_yield: true,
  actual_yield: true,
  yield_unit: true,
  status: true,
  sealed_at: true,
  created_by: true,
  created_at: true,
  updated_at: true
} as const

const anchorSelect = {
  id: true,
  checkpoint_no: true,
  data_hash: true,
  chain_network: true,
  tx_hash: true,
  tx_url: true,
  status: true,
  anchored_at: true
} as const

const SEASON_CODE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** So sánh theo lịch (UTC) — khớp cột @db.Date. */
function dateOnlyUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function assertSeasonHarvestDateOrder(params: {
  start: Date
  harvestStart: Date | null
  harvestEnd: Date | null
}) {
  const { start, harvestStart, harvestEnd } = params
  const t0 = dateOnlyUtc(start)
  if (harvestStart != null) {
    if (dateOnlyUtc(harvestStart) < t0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USER_MESSAGES.SEASON_HARVEST_START_BEFORE_SEASON_START
      })
    }
  }
  if (harvestEnd != null) {
    const minHarvest = harvestStart != null ? dateOnlyUtc(harvestStart) : t0
    if (dateOnlyUtc(harvestEnd) < minHarvest) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message:
          harvestStart != null
            ? USER_MESSAGES.SEASON_HARVEST_END_BEFORE_HARVEST_START
            : USER_MESSAGES.SEASON_HARVEST_END_BEFORE_SEASON_START
      })
    }
  }
}

/** 6 chữ cái in hoa + 6 chữ số ngẫu nhiên (vd: ABCDEF042891). */
function generateAutoSeasonCodeCandidate(): string {
  const lb = randomBytes(6)
  let letters = ''
  for (let i = 0; i < 6; i++) {
    letters += SEASON_CODE_LETTERS[lb[i]! % 26]!
  }
  const nb = randomBytes(4)
  const num = nb.readUInt32BE(0) % 1_000_000
  return `${letters}${String(num).padStart(6, '0')}`
}

class SeasonService {
  private readonly statusTransitions: Record<season_status, season_status[]> = {
    draft: ['ready_to_anchor', 'failed'],
    ready_to_anchor: ['anchored', 'failed'],
    anchored: ['amended', 'failed'],
    amended: ['ready_to_anchor', 'failed'],
    failed: ['draft']
  }

  private async ensureFarmOwner(farmId: string, userId: string) {
    const farm = await prisma.farms.findFirst({
      where: {
        id: farmId,
        owner_user_id: userId
      },
      select: { id: true }
    })

    if (farm == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN
      })
    }
  }

  /** Mã tự sinh: 6 chữ cái A–Z + 6 số; gửi `code` thì dùng giá trị đó (seed/API). */
  private async resolveSeasonCode(requested: string | undefined): Promise<string> {
    const trimmed = requested?.trim()
    if (trimmed != null && trimmed.length > 0) {
      if (trimmed.length > 80) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: 'code must be at most 80 characters'
        })
      }
      const exists = await prisma.seasons.findUnique({
        where: { code: trimmed },
        select: { id: true }
      })
      if (exists != null) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.SEASON_CODE_ALREADY_EXISTS
        })
      }
      return trimmed
    }

    for (let attempt = 0; attempt < 12; attempt++) {
      const code = generateAutoSeasonCodeCandidate()
      const dup = await prisma.seasons.findUnique({
        where: { code },
        select: { id: true }
      })
      if (dup == null) {
        return code
      }
    }

    throw new ErrorWithStatus({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: USER_MESSAGES.SEASON_CODE_GENERATION_FAILED
    })
  }

  createSeason = async ({ userId, payload }: { userId: string; payload: CreateSeasonRequestBody }) => {
    await this.ensureFarmOwner(payload.farmId, userId)

    const code = await this.resolveSeasonCode(payload.code)

    const start = new Date(payload.startDate)
    const harvestStart = payload.harvestStartDate ? new Date(payload.harvestStartDate) : null
    const harvestEnd = payload.harvestEndDate ? new Date(payload.harvestEndDate) : null
    assertSeasonHarvestDateOrder({ start, harvestStart, harvestEnd })

    return prisma.seasons.create({
      data: {
        farm_id: payload.farmId,
        code,
        crop_name: payload.cropName,
        start_date: start,
        harvest_start_date: harvestStart,
        harvest_end_date: harvestEnd,
        estimated_yield: payload.estimatedYield,
        actual_yield: payload.actualYield ?? null,
        yield_unit: payload.yieldUnit ?? 'kg',
        created_by: userId
      },
      select: seasonSelect
    })
  }

  getSeasons = async ({ userId, query }: { userId: string; query: GetSeasonsQuery }) => {
    const page = query.page ? Number(query.page) : 1
    const limit = query.limit ? Number(query.limit) : 10
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = query.searchTerm?.trim()
    const where: Prisma.seasonsWhereInput = {
      farms: {
        owner_user_id: userId
      },
      ...(query.farmId ? { farm_id: query.farmId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(term && term.length > 0
        ? {
            OR: [
              { code: { contains: term, mode: 'insensitive' } },
              { crop_name: { contains: term, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [items, total] = await Promise.all([
      prisma.seasons.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: seasonSelect
      }),
      prisma.seasons.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    const previousPage = safePage > 1 ? safePage - 1 : null
    const nextPage = totalPages > 0 && safePage < totalPages ? safePage + 1 : null

    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage,
        nextPage
      }
    }
  }

  getSeasonDetail = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        ...seasonSelect,
        season_anchors: {
          where: { is_final: true },
          orderBy: { created_at: 'desc' },
          take: 1,
          select: anchorSelect
        }
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    const { season_anchors, ...rest } = season
    return { ...rest, latestAnchor: season_anchors[0] ?? null }
  }

  private async getOwnedSeasonStatus(userId: string, seasonId: string) {
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
        yield_unit: true,
        start_date: true,
        harvest_start_date: true,
        harvest_end_date: true
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    return season
  }

  updateSeason = async ({
    userId,
    seasonId,
    payload
  }: {
    userId: string
    seasonId: string
    payload: UpdateSeasonRequestBody
  }) => {
    const season = await this.getOwnedSeasonStatus(userId, seasonId)
    if (season.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SEASON_IS_ANCHORED_CANNOT_UPDATE
      })
    }

    const data: Prisma.seasonsUncheckedUpdateInput = {}
    if (payload.code !== undefined) data.code = payload.code
    if (payload.cropName !== undefined) data.crop_name = payload.cropName
    if (payload.startDate !== undefined) data.start_date = new Date(payload.startDate)
    if (payload.harvestStartDate !== undefined) {
      data.harvest_start_date = payload.harvestStartDate ? new Date(payload.harvestStartDate) : null
    }
    if (payload.harvestEndDate !== undefined) {
      data.harvest_end_date = payload.harvestEndDate ? new Date(payload.harvestEndDate) : null
    }
    if (payload.estimatedYield !== undefined && payload.estimatedYield !== null) {
      data.estimated_yield = toYieldDecimal2Required(payload.estimatedYield)
    }
    if (payload.actualYield !== undefined) {
      data.actual_yield =
        payload.actualYield === null ? null : toYieldDecimal2(payload.actualYield)
    }
    if (payload.yieldUnit !== undefined) {
      data.yield_unit = payload.yieldUnit
    }

    const nextStart =
      payload.startDate !== undefined ? new Date(payload.startDate) : season.start_date
    const nextHarvestStart =
      payload.harvestStartDate !== undefined
        ? payload.harvestStartDate
          ? new Date(payload.harvestStartDate)
          : null
        : season.harvest_start_date
    const nextHarvestEnd =
      payload.harvestEndDate !== undefined
        ? payload.harvestEndDate
          ? new Date(payload.harvestEndDate)
          : null
        : season.harvest_end_date

    assertSeasonHarvestDateOrder({
      start: nextStart,
      harvestStart: nextHarvestStart,
      harvestEnd: nextHarvestEnd
    })

    const updated = await prisma.seasons.update({
      where: { id: seasonId },
      data,
      select: seasonSelect
    })

    domainEvents.emit(DomainEventName.SEASON_UPDATED, { seasonId: updated.id })
    return updated
  }

  deleteSeason = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
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
        _count: {
          select: {
            diary_entries: true,
            products: true,
            sale_units: true
          }
        }
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    if (season.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SEASON_IS_ANCHORED_CANNOT_DELETE
      })
    }

    const relatedCount = season._count.diary_entries + season._count.products + season._count.sale_units

    if (relatedCount > 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SEASON_HAS_RELATED_DATA
      })
    }

    await prisma.seasons.delete({
      where: { id: seasonId }
    })
  }

  changeSeasonStatus = async ({
    userId,
    seasonId,
    status
  }: {
    userId: string
    seasonId: string
    status: season_status
  }) => {
    const current = await this.getOwnedSeasonStatus(userId, seasonId)
    const allowed = this.statusTransitions[current.status]

    if (!allowed.includes(status)) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.INVALID_SEASON_STATUS_TRANSITION
      })
    }

    // Trước khi seal (ready_to_anchor) hoặc neo, bắt buộc phải có actual_yield + yield_unit
    // vì đây là dữ liệu định lượng quan trọng sẽ đi vào canonical hash + dùng làm trần cho sale_units.
    if (status === 'ready_to_anchor' || status === 'anchored') {
      const yieldValue = current.actual_yield ? Number(current.actual_yield.toString()) : 0
      const unit = current.yield_unit?.trim() ?? ''
      if (!Number.isFinite(yieldValue) || yieldValue <= 0 || unit.length === 0) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.SEASON_MISSING_YIELD_FOR_ANCHOR
        })
      }
    }

    if (status === 'anchored') {
      return this.performAnchorAndSeal({ userId, seasonId })
    }

    const updated = await prisma.seasons.update({
      where: { id: seasonId },
      data: { status, sealed_at: null },
      select: seasonSelect
    })
    return { season: updated, anchor: null }
  }

  /**
   * Pipeline neo dữ liệu mùa vụ lên Sepolia khi chuyển sang trạng thái anchored:
   * 1. Build canonical hash toàn bộ diary
   * 2. Gửi tx lên Sepolia (lấy txHash ngay, không chờ confirm)
   * 3. DB transaction: cập nhật status + tạo season_anchors record
   */
  private performAnchorAndSeal = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    // 1. Build canonical hash
    const canonical = await anchorService.buildCanonicalPayload({ userId, seasonId })

    // 2. Lấy checkpoint_no tiếp theo
    const latest = await prisma.season_anchors.findFirst({
      where: { season_id: seasonId },
      orderBy: { checkpoint_no: 'desc' },
      select: { checkpoint_no: true }
    })
    const nextCheckpointNo = (latest?.checkpoint_no ?? 0) + 1

    // 3. Gửi tx lên blockchain — nếu lỗi thì ném exception, season không đổi status
    let txHash: string
    let txUrl: string
    try {
      const result = await sendAnchorTx({ seasonId, dataHash: canonical.payloadHash })
      txHash = result.txHash
      txUrl = result.txUrl
    } catch (err) {
      if (err instanceof ErrorWithStatus) throw err
      throw new ErrorWithStatus({
        status: HTTP_STATUS.SERVICE_UNAVAILABLE,
        message: USER_MESSAGES.BLOCKCHAIN_ANCHOR_FAILED
      })
    }

    // 4. DB transaction: update season + tạo anchor record
    const [updatedSeason, anchorRecord] = await prisma.$transaction([
      prisma.seasons.update({
        where: { id: seasonId },
        data: { status: 'anchored', sealed_at: new Date() },
        select: seasonSelect
      }),
      prisma.season_anchors.create({
        data: {
          season_id: seasonId,
          checkpoint_no: nextCheckpointNo,
          checkpoint_type: 'auto_anchored',
          is_final: true,
          hash_algo: 'SHA-256',
          data_hash: canonical.payloadHash,
          chain_network: 'sepolia',
          tx_hash: txHash,
          tx_url: txUrl,
          status: 'pending',
          anchored_at: new Date(),
          anchor_meta: {
            canonicalSchemaVersion: 3,
            trigger: 'status_change_to_anchored'
          }
        },
        select: anchorSelect
      })
    ])

    return { season: updatedSeason, anchor: anchorRecord }
  }
}

const seasonService = new SeasonService()
export default seasonService
