import { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import openAIService from '~/lib/openai'
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

// ─── AI Review Summary ────────────────────────────────────────────────────────

const REVIEW_SUMMARY_SYSTEM_PROMPT = `Bạn là trợ lý AI phân tích đánh giá sản phẩm nông nghiệp Việt Nam. Nhiệm vụ là tổng hợp nhận xét từ người mua và tạo báo cáo ngắn gọn, thực tế cho người nông dân/chủ gian hàng.

Hướng dẫn phân tích:
1. CHỈ phân tích nhận xét có nội dung thực chất: tích cực, tiêu cực hoặc mang tính góp ý
2. BỎ QUA nhận xét: spam, ngoài lề (không liên quan sản phẩm/dịch vụ), chỉ emoji/ký hiệu vô nghĩa, quảng cáo, câu không có nghĩa
3. summary: tóm tắt 2-3 câu ngắn về tình hình chung
4. positive_points: danh sách những gì khách khen (nếu không có thì để mảng rỗng)
5. negative_points: danh sách phàn nàn có cơ sở (nếu không có thì để mảng rỗng)
6. suggestions: góp ý cụ thể từ phía khách hàng (nếu không có thì để mảng rỗng)
7. action_items: việc người nông dân nên làm ngay để khắc phục (nếu không có vấn đề thì để mảng rỗng)
8. overall_sentiment: "positive" (phần lớn tích cực), "negative" (phần lớn tiêu cực), "mixed" (lẫn lộn)
9. analyzed_count: số nhận xét đã phân tích (có nội dung thực chất)
10. ignored_count: số nhận xét bị bỏ qua (noise/spam/ngoài lề)
Viết hoàn toàn bằng tiếng Việt, ngắn gọn và thực tế.`

const REVIEW_SUMMARY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overall_sentiment: { type: 'string', description: 'positive | negative | mixed' },
    summary: { type: 'string' },
    positive_points: { type: 'array', items: { type: 'string' } },
    negative_points: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    action_items: { type: 'array', items: { type: 'string' } },
    analyzed_count: { type: 'integer' },
    ignored_count: { type: 'integer' }
  },
  required: [
    'overall_sentiment',
    'summary',
    'positive_points',
    'negative_points',
    'suggestions',
    'action_items',
    'analyzed_count',
    'ignored_count'
  ]
}

type ReviewSummaryAiResult = {
  overall_sentiment: string
  summary: string
  positive_points: string[]
  negative_points: string[]
  suggestions: string[]
  action_items: string[]
  analyzed_count: number
  ignored_count: number
}

type ReviewSummaryRow = {
  id: string
  target_type: string
  target_id: string
  overall_sentiment: string
  summary: string
  positive_points: Prisma.JsonValue
  negative_points: Prisma.JsonValue
  suggestions: Prisma.JsonValue
  action_items: Prisma.JsonValue
  analyzed_count: number
  ignored_count: number
  average_rating: { toNumber(): number } | null
  analyzed_at: Date
  created_at: Date
  updated_at: Date
}

function mapReviewSummary(row: ReviewSummaryRow) {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    overallSentiment: row.overall_sentiment,
    summary: row.summary,
    positivePoints: row.positive_points as string[],
    negativePoints: row.negative_points as string[],
    suggestions: row.suggestions as string[],
    actionItems: row.action_items as string[],
    analyzedCount: row.analyzed_count,
    ignoredCount: row.ignored_count,
    averageRating: row.average_rating != null ? row.average_rating.toNumber() : null,
    analyzedAt: row.analyzed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function formatReviewsForPrompt(reviews: { rating: number; comment: string | null; created_at: Date }[]): string {
  return reviews
    .map((r, i) => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
      const date = r.created_at.toISOString().slice(0, 10)
      const text = r.comment?.trim() || '(không có nhận xét)'
      return `[${i + 1}] ${stars} - "${text}" (${date})`
    })
    .join('\n')
}

async function callOpenAISummary(
  targetLabel: string,
  reviews: { rating: number; comment: string | null; created_at: Date }[],
  avgRating: number
): Promise<ReviewSummaryAiResult | null> {
  const content = `Phân tích ${reviews.length} nhận xét dưới đây cho ${targetLabel} (điểm trung bình: ${avgRating}/5):\n\n${formatReviewsForPrompt(reviews)}`
  return openAIService.generate<ReviewSummaryAiResult>({
    content,
    systemInstruction: REVIEW_SUMMARY_SYSTEM_PROMPT,
    jsonSchema: REVIEW_SUMMARY_SCHEMA
  })
}

async function upsertSummary(
  targetType: 'product' | 'shop',
  targetId: string,
  result: ReviewSummaryAiResult,
  avgRating: number
) {
  const now = new Date()
  const data = {
    overall_sentiment: result.overall_sentiment,
    summary: result.summary,
    positive_points: result.positive_points,
    negative_points: result.negative_points,
    suggestions: result.suggestions,
    action_items: result.action_items,
    analyzed_count: result.analyzed_count,
    ignored_count: result.ignored_count,
    average_rating: avgRating,
    analyzed_at: now,
    updated_at: now
  }
  return prisma.review_summaries.upsert({
    where: { target_type_target_id: { target_type: targetType, target_id: targetId } },
    create: { target_type: targetType, target_id: targetId, ...data },
    update: data
  })
}

// ─────────────────────────────────────────────────────────────────────────────

class ReviewSummaryService {
  analyzeProduct = async ({ productId, farmerUserId }: { productId: string; farmerUserId: string }) => {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        shops: {
          select: { id: true, farms: { select: { owner_user_id: true } } }
        }
      }
    })
    if (!product) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.PRODUCT_NOT_FOUND })
    }
    if (product.shops.farms.owner_user_id !== farmerUserId) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }

    const reviews = await prisma.shop_reviews.findMany({
      where: { product_id: productId },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: { rating: true, comment: true, created_at: true }
    })
    if (reviews.length === 0) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.BAD_REQUEST, message: USER_MESSAGES.REVIEW_SUMMARY_NO_REVIEWS })
    }

    const avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    const result = await callOpenAISummary(`sản phẩm "${product.name}"`, reviews, avgRating)
    if (!result) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: USER_MESSAGES.REVIEW_SUMMARY_AI_FAILED })
    }

    const saved = await upsertSummary('product', productId, result, avgRating)
    return mapReviewSummary(saved as ReviewSummaryRow)
  }

  getProductSummary = async ({ productId, farmerUserId }: { productId: string; farmerUserId: string }) => {
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { shops: { select: { farms: { select: { owner_user_id: true } } } } }
    })
    if (!product) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.PRODUCT_NOT_FOUND })
    }
    if (product.shops.farms.owner_user_id !== farmerUserId) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }

    const row = await prisma.review_summaries.findUnique({
      where: { target_type_target_id: { target_type: 'product', target_id: productId } }
    })
    if (!row) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.REVIEW_SUMMARY_NOT_FOUND })
    }
    return mapReviewSummary(row as unknown as ReviewSummaryRow)
  }

  analyzeShop = async ({ shopId, farmerUserId }: { shopId: string; farmerUserId: string }) => {
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, farms: { select: { owner_user_id: true } } }
    })
    if (!shop) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }
    if (shop.farms.owner_user_id !== farmerUserId) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }

    const reviews = await prisma.shop_reviews.findMany({
      where: { shop_id: shopId },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: { rating: true, comment: true, created_at: true }
    })
    if (reviews.length === 0) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.BAD_REQUEST, message: USER_MESSAGES.REVIEW_SUMMARY_NO_REVIEWS })
    }

    const avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    const result = await callOpenAISummary(`gian hàng "${shop.name}"`, reviews, avgRating)
    if (!result) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.INTERNAL_SERVER_ERROR, message: USER_MESSAGES.REVIEW_SUMMARY_AI_FAILED })
    }

    const saved = await upsertSummary('shop', shopId, result, avgRating)
    return mapReviewSummary(saved as ReviewSummaryRow)
  }

  getShopSummary = async ({ shopId, farmerUserId }: { shopId: string; farmerUserId: string }) => {
    const shop = await prisma.shops.findUnique({
      where: { id: shopId },
      select: { farms: { select: { owner_user_id: true } } }
    })
    if (!shop) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }
    if (shop.farms.owner_user_id !== farmerUserId) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.FORBIDDEN, message: USER_MESSAGES.SHOP_NOT_FOUND_OR_FORBIDDEN })
    }

    const row = await prisma.review_summaries.findUnique({
      where: { target_type_target_id: { target_type: 'shop', target_id: shopId } }
    })
    if (!row) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: USER_MESSAGES.REVIEW_SUMMARY_NOT_FOUND })
    }
    return mapReviewSummary(row as unknown as ReviewSummaryRow)
  }
}

const shopReviewService = new ShopReviewService()
const reviewSummaryService = new ReviewSummaryService()
export { reviewSummaryService }
export default shopReviewService
