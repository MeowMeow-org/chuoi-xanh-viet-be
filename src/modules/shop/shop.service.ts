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
    return shop
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
    return shops
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
    return {
      items,
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

    const season = await prisma.seasons.findFirst({
      where: { id: payload.season_id, farms: { owner_user_id: userId } },
      select: {
        id: true,
        farms: { select: { province: true, district: true, ward: true, address: true } }
      }
    })
    if (!season) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.SEASON_NOT_OWNED_BY_FARMER
      })
    }

    const addressParts = [season.farms.address, season.farms.ward, season.farms.district, season.farms.province]
      .filter(Boolean)
      .join(', ')
    const fullDescription = payload.description
      ? `${payload.description}\n\n📍 Địa chỉ: ${addressParts}`
      : `📍 Địa chỉ: ${addressParts}`

    return prisma.products.create({
      data: {
        shop_id: shopId,
        season_id: payload.season_id,
        name: payload.name,
        description: fullDescription,
        price: payload.price,
        unit: payload.unit ?? 'kg',
        stock_qty: payload.stock_qty ?? 0
      },
      select: productSelect
    })
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
          seasons: { select: { id: true, code: true, crop_name: true } }
        }
      }),
      prisma.products.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items,
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
          seasons: { select: { id: true, code: true, crop_name: true } }
        }
      }),
      prisma.products.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items,
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
        }
      }
    })

    if (!product) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.PRODUCT_NOT_FOUND
      })
    }

    return product
  }
}

const shopService = new ShopService()
export default shopService
