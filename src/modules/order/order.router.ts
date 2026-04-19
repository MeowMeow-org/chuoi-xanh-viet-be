import { Router } from 'express'
import { accessTokenValidator, requireConsumer, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createOrderController,
  getMyOrdersController,
  getShopOrdersController,
  getOrderByIdController,
  cancelOrderController,
  updateOrderStatusController
} from './order.controller'
import {
  createOrderValidator,
  orderIdParamValidator,
  getOrdersQueryValidator,
  updateOrderStatusValidator
} from './order.middleware'

const orderRouter = Router()

/**
 * @desc Consumer places a single-shop order (FE loops over shop groups)
 * @route POST /order
 * @access private (consumer only)
 */
orderRouter.post(
  '/',
  accessTokenValidator,
  requireConsumer,
  createOrderValidator,
  wrapAsync(createOrderController)
)

/**
 * @desc Buyer's own orders (filter by status, paginated)
 * @route GET /order/mine
 * @access private
 */
orderRouter.get(
  '/mine',
  accessTokenValidator,
  getOrdersQueryValidator,
  wrapAsync(getMyOrdersController)
)

/**
 * @desc Farmer lists orders belonging to their shop
 * @route GET /order/shop
 * @access private (farmer)
 */
orderRouter.get(
  '/shop',
  accessTokenValidator,
  requireFarmer,
  getOrdersQueryValidator,
  wrapAsync(getShopOrdersController)
)

/**
 * @desc Order detail (buyer or shop owner)
 * @route GET /order/:order_id
 * @access private
 */
orderRouter.get(
  '/:order_id',
  accessTokenValidator,
  orderIdParamValidator,
  wrapAsync(getOrderByIdController)
)

/**
 * @desc Buyer cancels a pending order
 * @route PATCH /order/:order_id/cancel
 * @access private (consumer)
 */
orderRouter.patch(
  '/:order_id/cancel',
  accessTokenValidator,
  requireConsumer,
  orderIdParamValidator,
  wrapAsync(cancelOrderController)
)

/**
 * @desc Farmer updates order status (pending→confirmed→shipping→delivered, or cancel)
 * @route PATCH /order/:order_id/status
 * @access private (farmer)
 */
orderRouter.patch(
  '/:order_id/status',
  accessTokenValidator,
  requireFarmer,
  orderIdParamValidator,
  updateOrderStatusValidator,
  wrapAsync(updateOrderStatusController)
)

export default orderRouter
