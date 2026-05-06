import { Router } from 'express'
import { accessTokenValidator, requireConsumer, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createOrderController,
  getMyOrdersController,
  getShopEarningsBreakdownController,
  getShopEarningsByFarmController,
  getShopEarningsController,
  getShopEarningsOrdersController,
  getShopOrdersController,
  getOrderByIdController,
  getPayosResumeController,
  renewPayosPaymentController,
  cancelOrderController,
  updateOrderStatusController,
  payosWebhookController
} from './order.controller'
import {
  createOrderValidator,
  orderIdParamValidator,
  getOrdersQueryValidator,
  shopEarningsBreakdownQueryValidator,
  shopEarningsByFarmQueryValidator,
  shopEarningsOrdersQueryValidator,
  updateOrderStatusValidator
} from './order.middleware'

const orderRouter = Router()

/**
 * @desc PayOS payment webhook (no JWT)
 * @route POST /order/payos/webhook
 */
orderRouter.post('/payos/webhook', (req, res) => {
  void payosWebhookController(req, res)
})

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
 * @desc Tổng kết tiền đã nhận theo từng khoảng (tháng / tuần 7 ngày / ngày) trong [from, to)
 * @route GET /order/shop/earnings/breakdown
 * @access private (farmer)
 */
orderRouter.get(
  '/shop/earnings/breakdown',
  accessTokenValidator,
  requireFarmer,
  shopEarningsBreakdownQueryValidator,
  wrapAsync(getShopEarningsBreakdownController)
)

/**
 * @desc Danh sách đơn liên quan kỳ: đã chốt (settled_at) hoặc tạo trong kỳ (chưa chốt)
 * @route GET /order/shop/earnings/orders
 * @access private (farmer)
 */
orderRouter.get(
  '/shop/earnings/orders',
  accessTokenValidator,
  requireFarmer,
  shopEarningsOrdersQueryValidator,
  wrapAsync(getShopEarningsOrdersController)
)

/**
 * @desc Doanh thu / lợi nhuận theo từng nông trại (kỳ tuỳ chọn [from, to), không truyền = toàn thời gian)
 * @route GET /order/shop/earnings/by-farm
 * @access private (farmer)
 */
orderRouter.get(
  '/shop/earnings/by-farm',
  accessTokenValidator,
  requireFarmer,
  shopEarningsByFarmQueryValidator,
  wrapAsync(getShopEarningsByFarmController)
)

/**
 * @desc Báo cáo lợi nhuận / hoa hồng (ước tính + đã chốt) theo gian hàng của nông dân
 * @route GET /order/shop/earnings
 * @access private (farmer)
 */
orderRouter.get(
  '/shop/earnings',
  accessTokenValidator,
  requireFarmer,
  wrapAsync(getShopEarningsController)
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
 * @desc Lấy lại link/QR PayOS (đơn pending, chỉ chủ đơn)
 * @route GET /order/:order_id/payos/resume
 */
orderRouter.get(
  '/:order_id/payos/resume',
  accessTokenValidator,
  requireConsumer,
  orderIdParamValidator,
  wrapAsync(getPayosResumeController)
)

/**
 * @desc Tạo giao dịch / link thanh toán PayOS mới (huỷ link cũ nếu còn) — ví dụ sau khi link hết hạn
 * @route POST /order/:order_id/payos/renew
 */
orderRouter.post(
  '/:order_id/payos/renew',
  accessTokenValidator,
  requireConsumer,
  orderIdParamValidator,
  wrapAsync(renewPayosPaymentController)
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
