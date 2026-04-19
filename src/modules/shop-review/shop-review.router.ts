import { Router } from 'express'
import { accessTokenValidator, requireConsumer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createShopReviewController,
  listProductReviewsController,
  listShopReviewsController,
  updateShopReviewController
} from './shop-review.controller'
import {
  createShopReviewValidator,
  listShopReviewsQueryValidator,
  productIdInParamsValidator,
  shopIdInParamsValidator,
  updateShopReviewValidator
} from './shop-review.middleware'

const shopReviewRouter = Router()

/**
 * @desc Đánh giá sản phẩm sau đơn đã giao (mỗi dòng sản phẩm trong đơn tối đa 1 đánh giá)
 * @route POST /review
 */
shopReviewRouter.post(
  '/',
  accessTokenValidator,
  requireConsumer,
  createShopReviewValidator,
  wrapAsync(createShopReviewController)
)

/**
 * @desc Danh sách đánh giá theo shop (theo từng sản phẩm; phân trang + điểm TB)
 * @route GET /review/shop/:shop_id
 * @access public (guest vẫn xem được)
 */
shopReviewRouter.get(
  '/shop/:shop_id',
  shopIdInParamsValidator,
  listShopReviewsQueryValidator,
  wrapAsync(listShopReviewsController)
)

/**
 * @desc Danh sách đánh giá theo sản phẩm
 * @route GET /review/product/:product_id
 * @access public (guest vẫn xem được)
 */
shopReviewRouter.get(
  '/product/:product_id',
  productIdInParamsValidator,
  listShopReviewsQueryValidator,
  wrapAsync(listProductReviewsController)
)

/**
 * @desc Sửa đánh giá của chính mình
 * @route PATCH /review/:review_id
 */
shopReviewRouter.patch(
  '/:review_id',
  accessTokenValidator,
  requireConsumer,
  updateShopReviewValidator,
  wrapAsync(updateShopReviewController)
)

export default shopReviewRouter
