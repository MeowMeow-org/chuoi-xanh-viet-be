import { SchemaType, type Schema } from '@google/generative-ai'
import { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import geminiService from '~/lib/gemini'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateShopRequestBody, UpdateShopRequestBody, AddProductRequestBody } from './shop.request'
import {
  resolveFarmCertificateBadgesMany,
  serializeBadges
} from '~/modules/certificate/certificate.badge'
import { isUnitCompatible, normalizeUnit, toKg } from '~/utils/unit'

const shopSelect = {
  id: true,
  farm_id: true,
  name: true,
  description: true,
  avatar_url: true,
  status: true,
  is_verified: true,
  certifications: true,
  created_at: true,
  updated_at: true
} as const

const productSelect = {
  id: true,
  shop_id: true,
  season_id: true,
  sale_unit_id: true,
  image_url: true,
  name: true,
  description: true,
  price: true,
  unit: true,
  stock_qty: true,
  is_active: true,
  created_at: true,
  updated_at: true
} as const

const SHOP_SUGGEST_SYSTEM_PROMPT = `Bạn là chuyên gia marketing nông sản Việt Nam.
Nhiệm vụ: Tạo tên gian hàng và mô tả hấp dẫn cho nông hộ bán hàng online.

Quy tắc:
- Tên gian hàng: ngắn gọn, dễ nhớ, thân thiện, có thể dùng tiếng Việt hoặc kết hợp, tối đa 60 ký tự
- Mô tả: 2-4 câu, nhấn mạnh nguồn gốc sạch/tự nhiên, địa phương trồng, loại cây trồng chính. Giọng văn thân thiện, gần gũi. Tối đa 500 ký tự
- Nếu thông tin farm không đầy đủ, hãy tự sáng tạo phù hợp`

const PRODUCT_LISTING_SUGGEST_SYSTEM_PROMPT = `Bạn là chuyên gia marketing nông sản và định giá bán tại Việt Nam.
Nhiệm vụ: Gợi ý mô tả ngắn cho người mua trên chợ online và mức giá bán (VNĐ).

Quy tắc mô tả:
- 2-4 câu tiếng Việt, thân thiện, rõ nguồn gốc / loại nông sản / điểm nổi bật
- Không bịa chứng nhận cụ thể nếu dữ liệu không nêu
- Tối đa 250 ký tự

Quy tắc giá (suggestedPriceVnd):
- Là giá cho MỘT đơn vị bán, đơn vị trùng với đơn vị lô (vd. lô tính theo kg → giá/kg; theo gam → giá/gam)
- Phải là số nguyên dương (VNĐ), không dấu phẩy/chấm phân tách; hợp lý với thị trường nội địa`

class ShopService {
  /** Gắn điểm TB + số lượt đánh giá (shop_reviews theo product_id) cho danh sách sản phẩm */
  private async attachProductReviewAggregates<T extends { id: string }>(
    items: T[]
  ): Promise<Array<T & { average_rating: number | null; review_count: number }>> {
    if (items.length === 0) return []

    const ids = items.map((i) => i.id)
    const groups = await prisma.shop_reviews.groupBy({
      by: ['product_id'],
      where: { product_id: { in: ids } },
      _avg: { rating: true },
      _count: { _all: true }
    })
    const statByProduct = new Map(
      groups.map((g) => [
        g.product_id,
        {
          average_rating:
            g._avg.rating != null ? Math.round(Number(g._avg.rating) * 10) / 10 : null,
          review_count: g._count._all
        }
      ])
    )

    return items.map((it) => {
      const s = statByProduct.get(it.id)
      return {
        ...it,
        average_rating: s?.average_rating ?? null,
        review_count: s?.review_count ?? 0
      }
    })
  }

  /** Điểm TB + số lượt đánh giá gắn với gian hàng (mọi shop_reviews của shop). */
  private async getShopReviewStatsByShopIds(
    shopIds: string[]
  ): Promise<Map<string, { average_rating: number | null; review_count: number }>> {
    if (shopIds.length === 0) return new Map()

    const unique = [...new Set(shopIds)]
    const groups = await prisma.shop_reviews.groupBy({
      by: ['shop_id'],
      where: { shop_id: { in: unique } },
      _avg: { rating: true },
      _count: { _all: true }
    })
    return new Map(
      groups.map((g) => [
        g.shop_id,
        {
          average_rating:
            g._avg.rating != null ? Math.round(Number(g._avg.rating) * 10) / 10 : null,
          review_count: g._count._all
        }
      ])
    )
  }

  private mergeShopReviewStats<T extends { id: string }>(
    shop: T,
    map: Map<string, { average_rating: number | null; review_count: number }>
  ): T & { average_rating: number | null; review_count: number } {
    const s = map.get(shop.id)
    return {
      ...shop,
      average_rating: s?.average_rating ?? null,
      review_count: s?.review_count ?? 0
    }
  }

  /** Gắn danh sách badge chứng chỉ (VietGAP…) cho shop/shops dựa trên farm_id */
  private async attachBadgesToShops<
    T extends { farm_id: string }
  >(shops: T[]): Promise<Array<T & { badges: ReturnType<typeof serializeBadges> }>> {
    if (shops.length === 0) return [] as never
    const farmIds = Array.from(new Set(shops.map((s) => s.farm_id)))
    const map = await resolveFarmCertificateBadgesMany(farmIds)
    return shops.map((s) => ({
      ...s,
      badges: serializeBadges(map.get(s.farm_id) ?? [])
    }))
  }

  /**
   * Xếp hạng sản phẩm trong cùng tập lọc được:
   * score = 0.4 * freshness + 0.4 * rating + 0.2 * scan
   * - freshness: created_at mới hơn → điểm cao hơn (0–1 trong tập)
   * - rating: TB sao 1–5 → (avg-1)/4 (0–1), không đánh giá → 0
   * - scan: lượt trace_scans theo sale_unit / max trong tập
   */
  private async orderProductIdsByAggregateScore(
    where: Prisma.productsWhereInput
  ): Promise<{ orderedIds: string[]; scoreById: Map<string, number> }> {
    const rows = await prisma.products.findMany({
      where,
      select: { id: true, created_at: true, sale_unit_id: true }
    })
    if (rows.length === 0) {
      return { orderedIds: [], scoreById: new Map() }
    }

    const ids = rows.map((r) => r.id)
    const saleUnitIds = [...new Set(rows.map((r) => r.sale_unit_id).filter((x): x is string => x != null))]

    const [reviewGroups, scanGroups] = await Promise.all([
      prisma.shop_reviews.groupBy({
        by: ['product_id'],
        where: { product_id: { in: ids } },
        _avg: { rating: true }
      }),
      saleUnitIds.length > 0
        ? prisma.trace_scans.groupBy({
            by: ['sale_unit_id'],
            where: { sale_unit_id: { in: saleUnitIds } },
            _count: { _all: true }
          })
        : Promise.resolve([])
    ])

    const avgByProduct = new Map(
      reviewGroups.map((g) => [g.product_id, g._avg.rating != null ? Number(g._avg.rating) : null])
    )
    const scanBySaleUnit = new Map(scanGroups.map((g) => [g.sale_unit_id, g._count._all]))

    const times = rows.map((r) => r.created_at.getTime())
    const minT = Math.min(...times)
    const maxT = Math.max(...times)

    const freshnessScore = (tMs: number) => (maxT === minT ? 1 : (tMs - minT) / (maxT - minT))

    const scanCounts = rows.map((r) => (r.sale_unit_id ? scanBySaleUnit.get(r.sale_unit_id) ?? 0 : 0))
    const maxScan = Math.max(0, ...scanCounts)

    const scored = rows.map((r, idx) => {
      const fs = freshnessScore(r.created_at.getTime())
      const avgR = avgByProduct.get(r.id)
      const rs =
        avgR == null || Number.isNaN(avgR) ? 0 : Math.max(0, Math.min(1, (avgR - 1) / 4))
      const sc = scanCounts[idx]
      const ss = maxScan === 0 ? 0 : sc / maxScan
      const score = 0.4 * fs + 0.4 * rs + 0.2 * ss
      return { id: r.id, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const scoreById = new Map(scored.map((s) => [s.id, s.score]))
    return { orderedIds: scored.map((s) => s.id), scoreById }
  }

  private async ensureFarmOwner(farmId: string, userId: string) {
    const farm = await prisma.farms.findFirst({
      where: { id: farmId, owner_user_id: userId },
      select: { id: true }
    })
    if (farm == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN
      })
    }
  }

  private async ensureShopOwner(shopId: string, userId: string) {
    const shop = await prisma.shops.findFirst({
      where: { id: shopId, farms: { owner_user_id: userId } },
      select: { id: true }
    })
    if (shop == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN
      })
    }
  }

  suggestShop = async ({ farmId, userId }: { farmId: string; userId: string }) => {
    await this.ensureFarmOwner(farmId, userId)

    const farm = await prisma.farms.findUnique({
      where: { id: farmId },
      select: { name: true, crop_main: true, province: true, district: true, ward: true, address: true }
    })
    if (!farm) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN })
    }

    const parts = [
      `Tên farm: ${farm.name}`,
      farm.crop_main ? `Cây trồng chính: ${farm.crop_main}` : null,
      farm.province ? `Tỉnh: ${farm.province}` : null,
      farm.district ? `Huyện: ${farm.district}` : null,
      farm.ward ? `Xã: ${farm.ward}` : null,
      farm.address ? `Địa chỉ: ${farm.address}` : null
    ]
    const userPrompt = `Tạo tên gian hàng và mô tả cho nông trại sau:\n${parts.filter(Boolean).join('\n')}`

    const result = await geminiService.generate<{ name: string; description: string }>({
      content: userPrompt,
      systemInstruction: SHOP_SUGGEST_SYSTEM_PROMPT,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: 'Tên gian hàng gợi ý' },
          description: { type: SchemaType.STRING, description: 'Mô tả gian hàng gợi ý' }
        },
        required: ['name', 'description']
      }
    })

    if (!result) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: USER_MESSAGES.AI_GENERATION_FAILED
      })
    }

    return { suggestedName: result.name, suggestedDescription: result.description }
  }

  suggestProductListing = async ({
    shopId,
    saleUnitId,
    userId
  }: {
    shopId: string
    saleUnitId: string
    userId: string
  }) => {
    await this.ensureShopOwner(shopId, userId)

    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: {
        farm_id: true,
        name: true,
        farms: {
          select: {
            name: true,
            crop_main: true,
            province: true,
            district: true,
            ward: true,
            address: true
          }
        }
      }
    })
    if (shop == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN
      })
    }

    const listed = await prisma.products.findFirst({
      where: { sale_unit_id: saleUnitId },
      select: { id: true }
    })
    if (listed != null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SALE_UNIT_ALREADY_LISTED
      })
    }

    const saleUnit = await prisma.sale_units.findFirst({
      where: {
        id: saleUnitId,
        seasons: {
          farm_id: shop.farm_id,
          farms: { owner_user_id: userId }
        }
      },
      select: {
        code: true,
        short_code: true,
        quantity: true,
        unit: true,
        qr_url: true,
        status: true,
        seasons: {
          select: {
            code: true,
            crop_name: true
          }
        }
      }
    })

    if (saleUnit == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.SALE_UNIT_NOT_AVAILABLE_FOR_SHOP
      })
    }

    if (saleUnit.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_NOT_ACTIVE
      })
    }

    const farm = shop.farms
    const lotLabel = (saleUnit.short_code?.trim() || saleUnit.code).trim()
    const unitLabel = saleUnit.unit === 'g' ? 'gam' : saleUnit.unit
    const farmLines = [
      farm ? `Tên nông trại: ${farm.name}` : null,
      farm?.crop_main ? `Cây trồng chính (farm): ${farm.crop_main}` : null,
      farm?.province ? `Tỉnh: ${farm.province}` : null,
      farm?.district ? `Huyện: ${farm.district}` : null,
      farm?.ward ? `Xã: ${farm.ward}` : null,
      farm?.address ? `Địa chỉ: ${farm.address}` : null
    ]
      .filter(Boolean)
      .join('\n')

    const userPrompt = `Gian hàng: ${shop.name}
${farmLines}

Lô bán:
- Mã lô: ${lotLabel}
- Khối lượng/số lượng lô: ${String(saleUnit.quantity)} ${unitLabel}
- Mùa vụ: ${saleUnit.seasons.crop_name} (mã ${saleUnit.seasons.code})
- Link truy xuất: ${saleUnit.qr_url || '—'}

Hãy gợi ý mô tả cho người mua và giá bán (một đơn vị = ${unitLabel}) phù hợp chợ online.`

    const listingSchemaInteger = {
      type: SchemaType.OBJECT,
      properties: {
        description: { type: SchemaType.STRING, description: 'Mô tả sản phẩm cho người mua' },
        suggestedPriceVnd: {
          type: SchemaType.INTEGER,
          description: 'Giá đề xuất VNĐ (số nguyên) cho một đơn vị bán, trùng đơn vị lô'
        }
      },
      required: ['description', 'suggestedPriceVnd'] as string[]
    }

    const listingSchemaPriceString = {
      type: SchemaType.OBJECT,
      properties: {
        description: { type: SchemaType.STRING, description: 'Mô tả sản phẩm cho người mua' },
        suggestedPriceVnd: {
          type: SchemaType.STRING,
          description: 'Giá VNĐ một đơn vị bán: chỉ chuỗi chữ số, ví dụ 25000'
        }
      },
      required: ['description', 'suggestedPriceVnd'] as string[]
    }

    let result = await geminiService.generate<{
      description: string
      suggestedPriceVnd: number
    }>({
      content: userPrompt,
      systemInstruction: PRODUCT_LISTING_SUGGEST_SYSTEM_PROMPT,
      responseSchema: listingSchemaInteger as Schema
    })

    if (!result) {
      const alt = await geminiService.generate<{
        description: string
        suggestedPriceVnd: string
      }>({
        content: userPrompt,
        systemInstruction: PRODUCT_LISTING_SUGGEST_SYSTEM_PROMPT,
        responseSchema: listingSchemaPriceString as Schema
      })
      if (alt) {
        const fromStr = Number(String(alt.suggestedPriceVnd ?? '').replace(/\D/g, ''))
        result = {
          description: alt.description,
          suggestedPriceVnd: Number.isFinite(fromStr) ? fromStr : NaN
        }
      }
    }

    if (!result) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: USER_MESSAGES.AI_GENERATION_FAILED
      })
    }

    const priceNum = Number(result.suggestedPriceVnd)
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: USER_MESSAGES.AI_GENERATION_FAILED
      })
    }

    const suggestedDescription = (result.description ?? '').trim().slice(0, 250)
    const suggestedPriceVnd = Math.round(priceNum)

    return { suggestedDescription, suggestedPriceVnd }
  }

  createShop = async ({ userId, payload }: { userId: string; payload: CreateShopRequestBody }) => {
    await this.ensureFarmOwner(payload.farm_id, userId)

    const existingShop = await prisma.shops.findUnique({
      where: { farm_id: payload.farm_id },
      select: { id: true }
    })
    if (existingShop) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SHOP_ALREADY_EXISTS_FOR_FARM
      })
    }

    return prisma.shops.create({
      data: {
        farm_id: payload.farm_id,
        name: payload.name,
        description: payload.description ?? null,
        avatar_url: payload.avatar_url ?? null
      },
      select: shopSelect
    })
  }

  updateShop = async ({
    shopId,
    userId,
    payload
  }: {
    shopId: string
    userId: string
    payload: UpdateShopRequestBody
  }) => {
    await this.ensureShopOwner(shopId, userId)

    const data: Prisma.shopsUncheckedUpdateInput = {}
    if (payload.name !== undefined) data.name = payload.name
    if (payload.description !== undefined) data.description = payload.description
    if (payload.avatar_url !== undefined) data.avatar_url = payload.avatar_url
    if (payload.status !== undefined) data.status = payload.status

    return prisma.shops.update({ where: { id: shopId }, data, select: shopSelect })
  }

  getShopById = async (shopId: string) => {
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: {
        ...shopSelect,
        farms: {
          select: {
            id: true,
            name: true,
            crop_main: true,
            province: true,
            district: true,
            ward: true,
            address: true,
            owner_user_id: true
          }
        }
      }
    })
    if (!shop) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }
    const statsMap = await this.getShopReviewStatsByShopIds([shop.id])
    const withStats = this.mergeShopReviewStats(shop, statsMap)
    const [withBadges] = await this.attachBadgesToShops([withStats])
    return withBadges
  }

  getMyShop = async (userId: string) => {
    const shops = await prisma.shops.findMany({
      where: { farms: { owner_user_id: userId } },
      select: {
        ...shopSelect,
        farms: {
          select: {
            id: true,
            name: true,
            crop_main: true,
            province: true,
            district: true,
            cooperative_members: {
              where: { status: 'approved' },
              orderBy: { verified_at: 'desc' },
              take: 1,
              select: {
                cooperative_user: {
                  select: { id: true, full_name: true, avatar_url: true }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })
    const statsMap = await this.getShopReviewStatsByShopIds(shops.map((s) => s.id))
    const withStats = shops.map((s) => this.mergeShopReviewStats(s, statsMap))
    return this.attachBadgesToShops(withStats)
  }

  /**
   * Danh sách gian hàng (mở cửa): lọc theo địa phương + tìm kiếm.
   * Sắp xếp: sao TB ↓, số đánh giá ↓, đã xác minh trước, mới hơn (created_at) ↓, số SP đang bán ↓.
   */
  getShops = async ({
    page = 1,
    limit = 10,
    searchTerm,
    province,
    district,
    ward,
    provinceCode,
    districtCode,
    wardCode
  }: {
    page?: number
    limit?: number
    searchTerm?: string
    /** @deprecated dùng provinceCode để filter chính xác. Giữ để backward-compat. */
    province?: string
    district?: string
    ward?: string
    provinceCode?: number
    districtCode?: number
    wardCode?: number
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()

    const andFilters: Prisma.shopsWhereInput[] = [{ status: 'open' }]

    /** Ưu tiên filter bằng code (chuẩn hóa); fallback name (legacy) khi không có code. */
    if (provinceCode != null) {
      andFilters.push({ farms: { province_code: provinceCode } })
    } else {
      const provinceFilter = province?.trim()
      if (provinceFilter && provinceFilter.length > 0) {
        andFilters.push({
          farms: { province: { contains: provinceFilter, mode: 'insensitive' } }
        })
      }
    }

    if (districtCode != null) {
      andFilters.push({ farms: { district_code: districtCode } })
    } else {
      const dist = district?.trim()
      if (dist && dist.length > 0) {
        andFilters.push({ farms: { district: { contains: dist, mode: 'insensitive' } } })
      }
    }

    if (wardCode != null) {
      andFilters.push({ farms: { ward_code: wardCode } })
    } else {
      const w = ward?.trim()
      if (w && w.length > 0) {
        andFilters.push({ farms: { ward: { contains: w, mode: 'insensitive' } } })
      }
    }

    if (term && term.length > 0) {
      andFilters.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { farms: { province: { contains: term, mode: 'insensitive' } } },
          { farms: { district: { contains: term, mode: 'insensitive' } } },
          { farms: { ward: { contains: term, mode: 'insensitive' } } }
        ]
      })
    }

    const where: Prisma.shopsWhereInput = { AND: andFilters }

    const minimal = await prisma.shops.findMany({
      where,
      select: { id: true, created_at: true, is_verified: true }
    })

    if (minimal.length === 0) {
      return {
        items: [],
        meta: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
          previousPage: null,
          nextPage: null
        }
      }
    }

    const ids = minimal.map((m) => m.id)
    const [statsMap, productGroups] = await Promise.all([
      this.getShopReviewStatsByShopIds(ids),
      prisma.products.groupBy({
        by: ['shop_id'],
        where: { shop_id: { in: ids }, is_active: true },
        _count: { _all: true }
      })
    ])
    const productCountByShop = new Map(productGroups.map((g) => [g.shop_id, g._count._all]))

    const stat = (shopId: string) =>
      statsMap.get(shopId) ?? { average_rating: null as number | null, review_count: 0 }

    minimal.sort((a, b) => {
      const sa = stat(a.id)
      const sb = stat(b.id)
      const avgA = sa.average_rating == null ? -Infinity : Number(sa.average_rating)
      const avgB = sb.average_rating == null ? -Infinity : Number(sb.average_rating)
      if (avgB !== avgA) return avgB - avgA

      if (sb.review_count !== sa.review_count) return sb.review_count - sa.review_count

      if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1

      const t = b.created_at.getTime() - a.created_at.getTime()
      if (t !== 0) return t

      const pa = productCountByShop.get(a.id) ?? 0
      const pb = productCountByShop.get(b.id) ?? 0
      return pb - pa
    })

    const orderedIds = minimal.map((m) => m.id)
    const total = orderedIds.length
    const pageIds = orderedIds.slice(skip, skip + safeLimit)

    if (pageIds.length === 0) {
      const totalPages = Math.ceil(total / safeLimit)
      return {
        items: [],
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          previousPage: safePage > 1 ? safePage - 1 : null,
          nextPage: null
        }
      }
    }

    const itemsRaw = await prisma.shops.findMany({
      where: { id: { in: pageIds } },
      select: {
        ...shopSelect,
        farms: {
          select: { id: true, name: true, crop_main: true, province: true, district: true, ward: true }
        }
      }
    })
    const byId = new Map(itemsRaw.map((i) => [i.id, i]))
    const itemsOrdered = pageIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => x != null)

    const withStats = itemsOrdered.map((s) => this.mergeShopReviewStats(s, statsMap))
    const withBadges = await this.attachBadgesToShops(withStats)
    const totalPages = Math.ceil(total / safeLimit)
    return {
      items: withBadges,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  /**
   * Điểm GPS các nông trại đang bán (gian hàng mở, đã ghim lat/lng).
   * Dùng bản đồ tổng quan trên trang chủ người mua — tối đa 500 điểm.
   */
  getFarmMapPins = async ({
    province,
    district,
    ward
  }: {
    province?: string
    district?: string
    ward?: string
  }) => {
    const provinceFilter = province?.trim()
    const andFilters: Prisma.shopsWhereInput[] = [
      { status: 'open' },
      {
        farms: {
          latitude: { not: null },
          longitude: { not: null }
        }
      }
    ]

    if (provinceFilter && provinceFilter.length > 0) {
      andFilters.push({
        farms: { province: { contains: provinceFilter, mode: 'insensitive' } }
      })
    }

    const dist = district?.trim()
    if (dist && dist.length > 0) {
      andFilters.push({ farms: { district: { contains: dist, mode: 'insensitive' } } })
    }

    const w = ward?.trim()
    if (w && w.length > 0) {
      andFilters.push({ farms: { ward: { contains: w, mode: 'insensitive' } } })
    }

    const rows = await prisma.shops.findMany({
      where: { AND: andFilters },
      select: {
        id: true,
        name: true,
        is_verified: true,
        farms: {
          select: {
            id: true,
            name: true,
            province: true,
            district: true,
            ward: true,
            latitude: true,
            longitude: true
          }
        }
      },
      take: 500,
      orderBy: { created_at: 'desc' }
    })

    const items: Array<{
      shop_id: string
      shop_name: string
      is_verified: boolean
      farm_id: string
      farm_name: string
      province: string | null
      district: string | null
      ward: string | null
      latitude: number
      longitude: number
    }> = []

    for (const s of rows) {
      const f = s.farms
      if (!f?.latitude || !f.longitude) continue
      const lat = Number(f.latitude)
      const lng = Number(f.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      items.push({
        shop_id: s.id,
        shop_name: s.name,
        is_verified: s.is_verified,
        farm_id: f.id,
        farm_name: f.name,
        province: f.province,
        district: f.district,
        ward: f.ward,
        latitude: lat,
        longitude: lng
      })
    }

    return { items, total: items.length }
  }

  // ─── Products ────────────────────────────────────────────

  getAvailableSeasons = async (userId: string) => {
    return prisma.seasons.findMany({
      where: { farms: { owner_user_id: userId } },
      select: {
        id: true,
        code: true,
        crop_name: true,
        actual_yield: true,
        yield_unit: true,
        status: true,
        farms: { select: { id: true, name: true, province: true, district: true, address: true } }
      },
      orderBy: { created_at: 'desc' }
    })
  }

  /**
   * Lô bán (đã phân + QR) thuộc đúng nông trại của gian hàng, còn active và chưa gắn sản phẩm chợ.
   */
  getAvailableSaleUnitsForShop = async ({ shopId, userId }: { shopId: string; userId: string }) => {
    await this.ensureShopOwner(shopId, userId)

    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { farm_id: true }
    })
    if (shop == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN
      })
    }

    const listed = await prisma.products.findMany({
      where: { sale_unit_id: { not: null } },
      select: { sale_unit_id: true }
    })
    const listedIds = listed.map((p) => p.sale_unit_id).filter((id): id is string => id != null)

    const where: Prisma.sale_unitsWhereInput = {
      status: 'active',
      seasons: {
        farm_id: shop.farm_id,
        farms: { owner_user_id: userId }
      }
    }
    if (listedIds.length > 0) {
      where.id = { notIn: listedIds }
    }

    return prisma.sale_units.findMany({
      where,
      select: {
        id: true,
        code: true,
        short_code: true,
        quantity: true,
        unit: true,
        qr_url: true,
        status: true,
        created_at: true,
        seasons: { select: { id: true, code: true, crop_name: true } }
      },
      orderBy: { created_at: 'desc' }
    })
  }

  addProduct = async ({
    shopId,
    userId,
    payload
  }: {
    shopId: string
    userId: string
    payload: AddProductRequestBody
  }) => {
    await this.ensureShopOwner(shopId, userId)

    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { farm_id: true }
    })
    if (shop == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN
      })
    }

    const duplicate = await prisma.products.findFirst({
      where: { sale_unit_id: payload.sale_unit_id },
      select: { id: true }
    })
    if (duplicate != null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SALE_UNIT_ALREADY_LISTED
      })
    }

    const saleUnit = await prisma.sale_units.findFirst({
      where: {
        id: payload.sale_unit_id,
        seasons: {
          farm_id: shop.farm_id,
          farms: { owner_user_id: userId }
        }
      },
      select: {
        id: true,
        code: true,
        short_code: true,
        quantity: true,
        unit: true,
        qr_url: true,
        status: true,
        season_id: true,
        seasons: {
          select: {
            farms: { select: { province: true, district: true, ward: true, address: true } }
          }
        }
      }
    })

    if (saleUnit == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.SALE_UNIT_NOT_AVAILABLE_FOR_SHOP
      })
    }

    if (saleUnit.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SALE_UNIT_NOT_ACTIVE
      })
    }

    const farm = saleUnit.seasons.farms
    const addressParts = [farm.address, farm.ward, farm.district, farm.province].filter(Boolean).join(', ')
    const lotLabel = (saleUnit.short_code?.trim() || saleUnit.code).trim()
    const name = payload.name != null && payload.name.trim().length > 0 ? payload.name.trim() : `Lô ${lotLabel}`

    // Đơn vị sản phẩm: mặc định = đơn vị của lô. Nếu farmer chọn khác, chỉ chấp nhận khi
    // cùng nhóm mass (kg/g/tấn…) để BE có thể quy đổi stock_qty tương ứng.
    const requestedUnit =
      payload.unit != null && payload.unit.trim().length > 0 ? payload.unit.trim() : saleUnit.unit
    if (!isUnitCompatible(requestedUnit, saleUnit.unit)) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.PRODUCT_UNIT_INCOMPATIBLE
      })
    }
    const unit = requestedUnit

    // Khối lượng còn lại của lô quy ra đơn vị sản phẩm (để check tồn kho không vượt lô).
    // Cùng đơn vị → dùng trực tiếp quantity.
    // Cùng nhóm mass khác đơn vị → quy đổi: lotQtyInProductUnit = lotKg / factor(productUnit)
    let lotMaxInProductUnit: Prisma.Decimal
    if (normalizeUnit(unit) === normalizeUnit(saleUnit.unit)) {
      lotMaxInProductUnit = new Prisma.Decimal(saleUnit.quantity)
    } else {
      const lotKg = toKg(saleUnit.quantity, saleUnit.unit)
      const oneUnitInKg = toKg(1, unit)
      if (!lotKg || !oneUnitInKg || oneUnitInKg.isZero()) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.PRODUCT_UNIT_INCOMPATIBLE
        })
      }
      lotMaxInProductUnit = lotKg.div(oneUnitInKg)
    }

    const stockQty =
      payload.stock_qty !== undefined && payload.stock_qty !== null
        ? new Prisma.Decimal(payload.stock_qty)
        : lotMaxInProductUnit

    if (stockQty.greaterThan(lotMaxInProductUnit)) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.PRODUCT_STOCK_EXCEEDS_LOT
      })
    }

    const userDesc = payload.description?.trim()
    const traceLine = saleUnit.qr_url ? `\n\n🔗 Truy xuất lô: ${saleUnit.qr_url}` : ''
    const fullDescription = userDesc
      ? `${userDesc}\n\n📍 Địa chỉ: ${addressParts}${traceLine}`
      : `📍 Địa chỉ: ${addressParts}${traceLine}`

    const imageUrl =
      payload.image_url === undefined || payload.image_url === null
        ? null
        : typeof payload.image_url === 'string'
          ? payload.image_url.trim() || null
          : null

    const created = await prisma.products.create({
      data: {
        shop_id: shopId,
        season_id: saleUnit.season_id,
        sale_unit_id: saleUnit.id,
        name,
        description: fullDescription,
        price: payload.price,
        unit: unit ?? 'kg',
        stock_qty: stockQty,
        image_url: imageUrl
      },
      select: productSelect
    })
    const [withStats] = await this.attachProductReviewAggregates([created])
    return withStats
  }

  getProducts = async ({ shopId, page = 1, limit = 20 }: { shopId: string; page?: number; limit?: number }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const where: Prisma.productsWhereInput = { shop_id: shopId }

    const { orderedIds, scoreById } = await this.orderProductIdsByAggregateScore(where)
    const total = orderedIds.length
    const pageIds = orderedIds.slice(skip, skip + safeLimit)

    if (pageIds.length === 0) {
      return {
        items: [],
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
          previousPage: safePage > 1 ? safePage - 1 : null,
          nextPage: null
        }
      }
    }

    const itemsRaw = await prisma.products.findMany({
      where: { id: { in: pageIds } },
      select: {
        ...productSelect,
        seasons: { select: { id: true, code: true, crop_name: true } },
        sale_unit: { select: { id: true, code: true, short_code: true, qr_url: true } }
      }
    })
    const byId = new Map(itemsRaw.map((i) => [i.id, i]))
    const itemsOrdered = pageIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => x != null)

    const itemsWithStats = await this.attachProductReviewAggregates(itemsOrdered)
    const itemsWithRank = itemsWithStats.map((p) => ({
      ...p,
      rank_score: Math.round((scoreById.get(p.id) ?? 0) * 1000) / 1000
    }))

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items: itemsWithRank,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  // ─── Public product browsing (consumer marketplace) ──────

  getPublicProducts = async ({
    page = 1,
    limit = 20,
    searchTerm,
    province,
    district,
    ward,
    provinceCode,
    districtCode,
    wardCode,
    shopId,
    sort,
    minPrice,
    maxPrice
  }: {
    page?: number
    limit?: number
    searchTerm?: string
    /** @deprecated dùng provinceCode để filter chính xác. */
    province?: string
    district?: string
    ward?: string
    provinceCode?: number
    districtCode?: number
    wardCode?: number
    shopId?: string
    sort?: string
    minPrice?: number
    maxPrice?: number
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()
    const andFilters: Prisma.productsWhereInput[] = [{ is_active: true }, { shops: { status: 'open' } }]

    if (shopId) andFilters.push({ shop_id: shopId })

    if (term && term.length > 0) {
      andFilters.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { shops: { name: { contains: term, mode: 'insensitive' } } }
        ]
      })
    }

    /** Ưu tiên filter bằng code (chuẩn hóa); fallback name (legacy) khi không có code. */
    if (provinceCode != null) {
      andFilters.push({ shops: { farms: { province_code: provinceCode } } })
    } else if (province && province.trim().length > 0) {
      andFilters.push({
        shops: { farms: { province: { contains: province.trim(), mode: 'insensitive' } } }
      })
    }

    if (districtCode != null) {
      andFilters.push({ shops: { farms: { district_code: districtCode } } })
    } else if (district && district.trim().length > 0) {
      andFilters.push({
        shops: { farms: { district: { contains: district.trim(), mode: 'insensitive' } } }
      })
    }

    if (wardCode != null) {
      andFilters.push({ shops: { farms: { ward_code: wardCode } } })
    } else if (ward && ward.trim().length > 0) {
      andFilters.push({
        shops: { farms: { ward: { contains: ward.trim(), mode: 'insensitive' } } }
      })
    }

    let lo = minPrice
    let hi = maxPrice
    if (lo !== undefined && hi !== undefined && lo > hi) {
      const t = lo
      lo = hi
      hi = t
    }
    const priceCond: Prisma.DecimalFilter = {}
    if (lo !== undefined && Number.isFinite(lo)) priceCond.gte = lo
    if (hi !== undefined && Number.isFinite(hi)) priceCond.lte = hi
    if (Object.keys(priceCond).length > 0) {
      andFilters.push({ price: priceCond })
    }

    const where: Prisma.productsWhereInput = { AND: andFilters }

    const publicProductListSelect = {
      ...productSelect,
      shops: {
        select: {
          id: true,
          farm_id: true,
          name: true,
          avatar_url: true,
          is_verified: true,
          certifications: true,
          farms: {
            select: {
              id: true,
              name: true,
              province: true,
              district: true,
              ward: true
            }
          }
        }
      },
      seasons: { select: { id: true, code: true, crop_name: true } },
      sale_unit: { select: { id: true, code: true, short_code: true, qr_url: true } }
    }

    const useDbSort = sort === 'price_asc' || sort === 'price_desc' || sort === 'newest'

    if (useDbSort) {
      let orderBy: Prisma.productsOrderByWithRelationInput
      if (sort === 'price_asc') orderBy = { price: 'asc' }
      else if (sort === 'price_desc') orderBy = { price: 'desc' }
      else orderBy = { created_at: 'desc' }

      const [itemsRaw, total] = await Promise.all([
        prisma.products.findMany({
          where,
          orderBy,
          skip,
          take: safeLimit,
          select: publicProductListSelect
        }),
        prisma.products.count({ where })
      ])

      if (itemsRaw.length === 0) {
        const totalPages = Math.ceil(total / safeLimit)
        return {
          items: [],
          meta: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
            previousPage: safePage > 1 ? safePage - 1 : null,
            nextPage: null
          }
        }
      }

      const itemsWithStats = await this.attachProductReviewAggregates(itemsRaw)
      const shopInputs = itemsWithStats
        .map((p) => p.shops)
        .filter((s): s is NonNullable<typeof s> => !!s && typeof s.farm_id === 'string')
      const shopsWithBadges = await this.attachBadgesToShops(shopInputs)
      const badgeByShopId = new Map(shopsWithBadges.map((s) => [s.id, s.badges]))
      const itemsFinal = itemsWithStats.map((p) => ({
        ...p,
        shops: p.shops
          ? { ...p.shops, badges: badgeByShopId.get(p.shops.id) ?? [] }
          : p.shops
      }))
      const totalPages = Math.ceil(total / safeLimit)
      return {
        items: itemsFinal,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          previousPage: safePage > 1 ? safePage - 1 : null,
          nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
        }
      }
    }

    const { orderedIds, scoreById } = await this.orderProductIdsByAggregateScore(where)
    const total = orderedIds.length
    const pageIds = orderedIds.slice(skip, skip + safeLimit)

    if (pageIds.length === 0) {
      const totalPages = Math.ceil(total / safeLimit)
      return {
        items: [],
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          previousPage: safePage > 1 ? safePage - 1 : null,
          nextPage: null
        }
      }
    }

    const itemsRaw = await prisma.products.findMany({
      where: { id: { in: pageIds } },
      select: publicProductListSelect
    })
    const byId = new Map(itemsRaw.map((i) => [i.id, i]))
    const itemsOrdered = pageIds
      .map((id) => byId.get(id))
      .filter((x): x is NonNullable<typeof x> => x != null)

    const itemsWithStats = await this.attachProductReviewAggregates(itemsOrdered)
    const shopInputs = itemsWithStats
      .map((p) => p.shops)
      .filter(
        (s): s is NonNullable<typeof s> => !!s && typeof s.farm_id === 'string'
      )
    const shopsWithBadges = await this.attachBadgesToShops(shopInputs)
    const badgeByShopId = new Map(shopsWithBadges.map((s) => [s.id, s.badges]))
    const itemsFinal = itemsWithStats.map((p) => ({
      ...p,
      rank_score: Math.round((scoreById.get(p.id) ?? 0) * 1000) / 1000,
      shops: p.shops
        ? { ...p.shops, badges: badgeByShopId.get(p.shops.id) ?? [] }
        : p.shops
    }))
    const totalPages = Math.ceil(total / safeLimit)
    return {
      items: itemsFinal,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  getPublicProductById = async (productId: string) => {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: {
        ...productSelect,
        shops: {
          select: {
            id: true,
            farm_id: true,
            name: true,
            description: true,
            avatar_url: true,
            is_verified: true,
            certifications: true,
            farms: {
              select: {
                id: true,
                name: true,
                owner_user_id: true,
                crop_main: true,
                province: true,
                district: true,
                ward: true,
                address: true,
                latitude: true,
                longitude: true
              }
            }
          }
        },
        seasons: {
          select: {
            id: true,
            code: true,
            crop_name: true,
            start_date: true,
            harvest_start_date: true,
            harvest_end_date: true,
            status: true
          }
        },
        sale_unit: { select: { id: true, code: true, short_code: true, qr_url: true } }
      }
    })

    if (!product) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.PRODUCT_NOT_FOUND
      })
    }

    const [withProductStats] = await this.attachProductReviewAggregates([product])
    if (!withProductStats.shops) {
      return withProductStats
    }
    const sm = await this.getShopReviewStatsByShopIds([withProductStats.shops.id])
    const shopsMerged = this.mergeShopReviewStats(withProductStats.shops, sm)
    const [shopWithBadges] = await this.attachBadgesToShops([shopsMerged])
    return {
      ...withProductStats,
      shops: shopWithBadges
    }
  }
}

const shopService = new ShopService()
export default shopService
