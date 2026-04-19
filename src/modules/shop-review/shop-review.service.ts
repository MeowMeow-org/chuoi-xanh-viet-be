import { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateShopReviewBody, UpdateShopReviewBody } from './shop-review.request'

const reviewSelect = {
  id: true,
  user_id: true,
  order_id: true,
  shop_id: true,
  product_id: true,
  rating: true,
  comment: true,
  is_verified_purchase: true,
  created_at: true,
  updated_at: true,
  users: {
    select: { id: true, full_name: true, avatar_url: true }
  },
  products: {
    select: { id: true, name: true, image_url: true }
  }
} as const

function mapPublicReview(row: {
  id: string
  user_id: string
  order_id: string
  shop_id: string
  product_id: string
  rating: number
  comment: string | null
  is_verified_purchase: boolean
  created_at: Date
  updated_at: Date
  users: { id: string; full_name: string; avatar_url: string | null }
  products: { id: string; name: string; image_url: string | null }
}) {
  return {
    id: row.id,
    userId: row.user_id,
    orderId: row.order_id,
    shopId: row.shop_id,
    productId: row.product_id,
    rating: row.rating,
    comment: row.comment,
    isVerifiedPurchase: row.is_verified_purchase,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewer: {
      id: row.users.id,
      fullName: row.users.full_name,
      avatarUrl: row.users.avatar_url
    },
    product: {
      id: row.products.id,
      name: row.products.name,
      imageUrl: row.products.image_url
    }
  }
}

async function listReviewsPage(params: {
  where: Prisma.shop_reviewsWhereInput
  page?: number
  limit?: number
}) {
  const safePage = Math.max(1, params.page ?? 1)
  const safeLimit = Math.min(50, Math.max(1, params.limit ?? 20))
  const skip = (safePage - 1) * safeLimit
  const where = params.where

  const [rows, total, agg] = await Promise.all([
    prisma.shop_reviews.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit,
      select: reviewSelect
    }),
    prisma.shop_reviews.count({ where }),
    prisma.shop_reviews.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true }
    })
  ])

  const totalPages = Math.ceil(total / safeLimit)
  const avgRating =
    agg._avg.rating != null ? Math.round(Number(agg._avg.rating) * 10) / 10 : null

  return {
    items: rows.map(mapPublicReview),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      previousPage: safePage > 1 ? safePage - 1 : null,
      nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null,
      averageRating: avgRating,
      reviewCount: agg._count._all
    }
  }
}

class ShopReviewService {
  create = async ({ buyerUserId, payload }: { buyerUserId: string; payload: CreateShopReviewBody }) => {
    const rating = Number(payload.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SHOP_REVIEW_RATING_INVALID
      })
    }

    const comment =
      payload.comment != null && String(payload.comment).trim().length > 0
        ? String(payload.comment).trim().slice(0, 2000)
        : null

    const order = await prisma.orders.findUnique({
      where: { id: payload.order_id },
      select: {
        id: true,
        buyer_user_id: true,
        shop_id: true,
        status: true,
        order_items: {
          where: { product_id: payload.product_id },
          select: { id: true, product_id: true }
        },
        shops: {
          select: {
            id: true,
            name: true,
            farms: { select: { owner_user_id: true } }
          }
        }
      }
    })

    if (!order) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.ORDER_NOT_FOUND
      })
    }
    if (order.buyer_user_id !== buyerUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.ORDER_FORBIDDEN
      })
    }
    if (order.status !== 'delivered') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SHOP_REVIEW_ORDER_NOT_DELIVERED
      })
    }
    if (order.order_items.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SHOP_REVIEW_PRODUCT_NOT_IN_ORDER
      })
    }

    const product = await prisma.products.findFirst({
      where: { id: payload.product_id, shop_id: order.shop_id },
      select: { id: true, name: true }
    })
    if (!product) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SHOP_REVIEW_PRODUCT_NOT_IN_ORDER
      })
    }

    try {
      const row = await prisma.shop_reviews.create({
        data: {
          user_id: buyerUserId,
          order_id: order.id,
          shop_id: order.shop_id,
          product_id: payload.product_id,
          rating,
          comment,
          is_verified_purchase: true
        },
        select: reviewSelect
      })
      return {
        review: mapPublicReview(row),
        shopId: order.shop_id,
        shopName: order.shops?.name ?? 'Gian hàng',
        productId: product.id,
        productName: product.name,
        farmerUserId: order.shops?.farms?.owner_user_id ?? null
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.SHOP_REVIEW_ALREADY_EXISTS
        })
      }
      throw e
    }
  }

  listByShop = async ({
    shopId,
    page = 1,
    limit = 20
  }: {
    shopId: string
    page?: number
    limit?: number
  }) => {
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { id: true }
    })
    if (!shop) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN
      })
    }

    return listReviewsPage({ where: { shop_id: shopId }, page, limit })
  }

  listByProduct = async ({
    productId,
    page = 1,
    limit = 20
  }: {
    productId: string
    page?: number
    limit?: number
  }) => {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true }
    })
    if (!product) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.PRODUCT_NOT_FOUND
      })
    }

    return listReviewsPage({ where: { product_id: productId }, page, limit })
  }

  updateMine = async ({
    reviewId,
    buyerUserId,
    payload
  }: {
    reviewId: string
    buyerUserId: string
    payload: UpdateShopReviewBody
  }) => {
    const existing = await prisma.shop_reviews.findFirst({
      where: { id: reviewId, user_id: buyerUserId },
      select: { id: true }
    })
    if (!existing) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SHOP_REVIEW_NOT_FOUND
      })
    }

    const data: Prisma.shop_reviewsUncheckedUpdateInput = {}
    if (payload.rating !== undefined) {
      const r = Number(payload.rating)
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.SHOP_REVIEW_RATING_INVALID
        })
      }
      data.rating = r
    }
    if (payload.comment !== undefined) {
      data.comment =
        payload.comment != null && String(payload.comment).trim().length > 0
          ? String(payload.comment).trim().slice(0, 2000)
          : null
    }
    if (Object.keys(data).length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.SHOP_REVIEW_NOTHING_TO_UPDATE
      })
    }
    data.updated_at = new Date()

    const row = await prisma.shop_reviews.update({
      where: { id: reviewId },
      data,
      select: reviewSelect
    })
    return mapPublicReview(row)
  }
}

const shopReviewService = new ShopReviewService()
export default shopReviewService
