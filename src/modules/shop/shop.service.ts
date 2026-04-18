import { SchemaType } from '@google/generative-ai'
import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import geminiService from '~/lib/gemini'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateShopRequestBody, UpdateShopRequestBody, AddProductRequestBody } from './shop.request'

const shopSelect = {
  id: true,
  farm_id: true,
  name: true,
  description: true,
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
Nhiệm vụ: Tạo tên gian hàng và mô tả hấp dẫn cho nông dân bán hàng online.

Quy tắc:
- Tên gian hàng: ngắn gọn, dễ nhớ, thân thiện, có thể dùng tiếng Việt hoặc kết hợp, tối đa 60 ký tự
- Mô tả: 2-4 câu, nhấn mạnh nguồn gốc sạch/tự nhiên, địa phương trồng, loại cây trồng chính. Giọng văn thân thiện, gần gũi. Tối đa 500 ký tự
- Nếu thông tin farm không đầy đủ, hãy tự sáng tạo phù hợp`

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
        description: payload.description ?? null
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
    return this.mergeShopReviewStats(shop, statsMap)
  }

  getMyShop = async (userId: string) => {
    const shops = await prisma.shops.findMany({
      where: { farms: { owner_user_id: userId } },
      select: {
        ...shopSelect,
        farms: { select: { id: true, name: true, crop_main: true, province: true, district: true } }
      },
      orderBy: { created_at: 'desc' }
    })
    const statsMap = await this.getShopReviewStatsByShopIds(shops.map((s) => s.id))
    return shops.map((s) => this.mergeShopReviewStats(s, statsMap))
  }

  getShops = async ({
    page = 1,
    limit = 10,
    searchTerm
  }: {
    page?: number
    limit?: number
    searchTerm?: string
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()
    const where: Prisma.shopsWhereInput =
      term && term.length > 0
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } },
              { farms: { province: { contains: term, mode: 'insensitive' } } },
              { farms: { district: { contains: term, mode: 'insensitive' } } }
            ]
          }
        : {}

    const [items, total] = await Promise.all([
      prisma.shops.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          ...shopSelect,
          farms: { select: { id: true, name: true, crop_main: true, province: true, district: true } }
        }
      }),
      prisma.shops.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    const statsMap = await this.getShopReviewStatsByShopIds(items.map((s) => s.id))
    return {
      items: items.map((s) => this.mergeShopReviewStats(s, statsMap)),
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
    const name =
      payload.name != null && payload.name.trim().length > 0 ? payload.name.trim() : `Lô ${lotLabel}`

    const unit =
      payload.unit != null && payload.unit.trim().length > 0 ? payload.unit.trim() : saleUnit.unit

    const stockQty =
      payload.stock_qty !== undefined && payload.stock_qty !== null
        ? payload.stock_qty
        : Number(saleUnit.quantity)

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

    const [items, total] = await Promise.all([
      prisma.products.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          ...productSelect,
          seasons: { select: { id: true, code: true, crop_name: true } },
          sale_unit: { select: { id: true, code: true, short_code: true, qr_url: true } }
        }
      }),
      prisma.products.count({ where })
    ])

    const itemsWithStats = await this.attachProductReviewAggregates(items)
    const totalPages = Math.ceil(total / safeLimit)
    return {
      items: itemsWithStats,
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
    shopId
  }: {
    page?: number
    limit?: number
    searchTerm?: string
    province?: string
    shopId?: string
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()
    const andFilters: Prisma.productsWhereInput[] = [
      { is_active: true },
      { shops: { status: 'open' } }
    ]

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

    if (province && province.trim().length > 0) {
      andFilters.push({
        shops: { farms: { province: { contains: province, mode: 'insensitive' } } }
      })
    }

    const where: Prisma.productsWhereInput = { AND: andFilters }

    const [items, total] = await Promise.all([
      prisma.products.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          ...productSelect,
          shops: {
            select: {
              id: true,
              name: true,
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
      }),
      prisma.products.count({ where })
    ])

    const itemsWithStats = await this.attachProductReviewAggregates(items)
    const totalPages = Math.ceil(total / safeLimit)
    return {
      items: itemsWithStats,
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
            name: true,
            description: true,
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
                address: true
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
    return {
      ...withProductStats,
      shops: this.mergeShopReviewStats(withProductStats.shops, sm)
    }
  }
}

const shopService = new ShopService()
export default shopService
