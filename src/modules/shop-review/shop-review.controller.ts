import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import shopReviewService from './shop-review.service'
import type { CreateShopReviewBody, ListShopReviewsQuery, UpdateShopReviewBody } from './shop-review.request'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'
import prisma from '~/lib/prisma'

export const createShopReviewController = async (
  req: Request<ParamsDictionary, unknown, CreateShopReviewBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await shopReviewService.create({
    buyerUserId: user_id,
    payload: req.body
  })

  if (result.farmerUserId) {
    const buyer = await prisma.users.findUnique({
      where: { id: user_id },
      select: { full_name: true }
    })
    notificationDispatch.shopReviewNewForFarmer({
      farmerUserId: result.farmerUserId,
      buyerUserId: user_id,
      buyerName: buyer?.full_name?.trim() || 'Người mua',
      shopId: result.shopId,
      shopName: result.shopName,
      productId: result.productId,
      productName: result.productName,
      rating: result.review.rating,
      reviewId: result.review.id
    })
  }

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.SHOP_REVIEW_CREATE_SUCCESS,
    data: result.review
  })
}

export const listShopReviewsController = async (
  req: Request<{ shop_id: string }, unknown, unknown, ListShopReviewsQuery>,
  res: Response
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined

  const data = await shopReviewService.listByShop({
    shopId: req.params.shop_id,
    page,
    limit
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.SHOP_REVIEW_LIST_SUCCESS,
    data
  })
}

export const listProductReviewsController = async (
  req: Request<{ product_id: string }, unknown, unknown, ListShopReviewsQuery>,
  res: Response
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined

  const data = await shopReviewService.listByProduct({
    productId: req.params.product_id,
    page,
    limit
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.SHOP_REVIEW_LIST_SUCCESS,
    data
  })
}

export const updateShopReviewController = async (
  req: Request<{ review_id: string }, unknown, UpdateShopReviewBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const review = await shopReviewService.updateMine({
    reviewId: req.params.review_id,
    buyerUserId: user_id,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.SHOP_REVIEW_UPDATE_SUCCESS,
    data: review
  })
}
