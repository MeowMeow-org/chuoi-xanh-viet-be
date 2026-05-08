import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { TokenPayLoad } from '../auth/auth.request'
import orderService from './order.service'
import { verifyPayosWebhook } from './order.payos'
import type { CreateOrderRequestBody, GetOrdersQuery, UpdateOrderStatusBody } from './order.request'
import type { order_status } from '@prisma/client'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'

const mapOrderRow = (order: {
  id: string
  buyer_user_id: string
  shop_id: string
  status: string
  payment_method: string
  payment_status: string
  total_amount: unknown
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  note: string | null
  payos_link_expires_at?: Date | null
  commission_rate?: unknown | null
  estimated_commission_amount?: unknown | null
  estimated_seller_payout?: unknown | null
  estimated_at?: Date | null
  commission_amount?: unknown | null
  seller_payout?: unknown | null
  settled_at?: Date | null
  created_at: Date
  updated_at: Date
  shops?: {
    id: string
    name: string
    is_verified: boolean
    farms: {
      id: string
      name: string
      owner_user_id: string
      province: string | null
      district: string | null
      ward: string | null
    }
  }
  order_items?: Array<{
    id: string
    order_id: string
    product_id: string
    qty: unknown
    unit_price: unknown
    line_total: unknown
    products: { id: string; name: string; unit: string | null; image_url: string | null }
    my_review?: { id: string; rating: number; comment: string | null } | null
  }>
}) => ({
  id: order.id,
  buyerUserId: order.buyer_user_id,
  shopId: order.shop_id,
  status: order.status,
  paymentMethod: order.payment_method,
  paymentStatus: order.payment_status,
  totalAmount: order.total_amount,
  shippingName: order.shipping_name,
  shippingPhone: order.shipping_phone,
  shippingAddress: order.shipping_address,
  note: order.note,
  payosLinkExpiresAt:
    order.payos_link_expires_at != null
      ? order.payos_link_expires_at.toISOString()
      : null,
  commissionRate: order.commission_rate != null ? Number(order.commission_rate) : null,
  estimatedCommissionAmount:
    order.estimated_commission_amount != null ? Number(order.estimated_commission_amount) : null,
  estimatedSellerPayout:
    order.estimated_seller_payout != null ? Number(order.estimated_seller_payout) : null,
  estimatedAt: order.estimated_at != null ? order.estimated_at.toISOString() : null,
  commissionAmount: order.commission_amount != null ? Number(order.commission_amount) : null,
  sellerPayout: order.seller_payout != null ? Number(order.seller_payout) : null,
  settledAt: order.settled_at != null ? order.settled_at.toISOString() : null,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  shop: order.shops
    ? {
        id: order.shops.id,
        name: order.shops.name,
        isVerified: order.shops.is_verified,
        farm: {
          id: order.shops.farms.id,
          name: order.shops.farms.name,
          ownerUserId: order.shops.farms.owner_user_id,
          province: order.shops.farms.province,
          district: order.shops.farms.district,
          ward: order.shops.farms.ward
        }
      }
    : null,
  items:
    order.order_items?.map((it) => ({
      id: it.id,
      orderId: it.order_id,
      productId: it.product_id,
      qty: it.qty,
      unitPrice: it.unit_price,
      lineTotal: it.line_total,
      product: {
        id: it.products.id,
        name: it.products.name,
        unit: it.products.unit,
        imageUrl: it.products.image_url
      },
      myReview: it.my_review ?? null
    })) ?? []
})

export const createOrderController = async (
  req: Request<ParamsDictionary, unknown, CreateOrderRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { order, checkoutUrl } = await orderService.createOrder({
    buyerUserId: user_id,
    payload: req.body
  })
  notificationDispatch.orderCreatedForFarmer(order as any)

  const row = mapOrderRow(order as any)
  const data = checkoutUrl ? { ...row, checkoutUrl } : row

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_ORDER_SUCCESS,
    data
  })
}

export const payosWebhookController = async (req: Request, res: Response) => {
  try {
    const body = req.body as { code?: string; data?: { orderCode?: number } }
    if (body?.code === '00' && body?.data?.orderCode === 123) {
      res.status(200).json({ received: true })
      return
    }

    const verified = await verifyPayosWebhook(req.body)
    await orderService.handlePayosWebhook({
      orderCode: verified.orderCode,
      amount: verified.amount,
      code: verified.code
    })
    res.status(200).json({ success: true })
  } catch (e) {
    console.error('PayOS webhook:', e)
    res.status(200).json({ success: false })
  }
}

export const getMyOrdersController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetOrdersQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const status = req.query.status as order_status | undefined

  const { items, meta } = await orderService.getMyOrders({
    buyerUserId: user_id,
    page,
    limit,
    status
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_ORDERS_SUCCESS,
    data: { items: items.map((o) => mapOrderRow(o as any)), meta }
  })
}

export const getShopEarningsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await orderService.getShopEarnings({ farmerUserId: user_id })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SHOP_EARNINGS_SUCCESS,
    data
  })
}

export const getShopEarningsByFarmController = async (
  req: Request<
    ParamsDictionary,
    unknown,
    unknown,
    { from?: string; to?: string }
  >,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const fromQ = req.query.from
  const toQ = req.query.to
  const fromRaw = typeof fromQ === 'string' ? fromQ : undefined
  const toRaw = typeof toQ === 'string' ? toQ : undefined

  if ((fromRaw && !toRaw) || (!fromRaw && toRaw)) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.BAD_REQUEST,
      message: USER_MESSAGES.ORDER_EARNINGS_INVALID_PERIOD
    })
  }

  let from: Date | undefined
  let to: Date | undefined
  if (fromRaw && toRaw) {
    from = new Date(fromRaw)
    to = new Date(toRaw)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() >= to.getTime()) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_EARNINGS_INVALID_PERIOD
      })
    }
  }

  const data = await orderService.getShopEarningsByFarm({
    farmerUserId: user_id,
    from,
    to
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SHOP_EARNINGS_BY_FARM_SUCCESS,
    data
  })
}

export const getShopEarningsBreakdownController = async (
  req: Request<
    ParamsDictionary,
    unknown,
    unknown,
    { from: string; to: string; bucket: 'month' | 'week' | 'day' }
  >,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const from = new Date(req.query.from)
  const to = new Date(req.query.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() >= to.getTime()) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.BAD_REQUEST,
      message: USER_MESSAGES.ORDER_EARNINGS_INVALID_PERIOD
    })
  }
  const bucket = req.query.bucket
  const data = await orderService.getShopEarningsBreakdown({
    farmerUserId: user_id,
    from,
    to,
    bucket
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SHOP_EARNINGS_BREAKDOWN_SUCCESS,
    data
  })
}

export const getShopEarningsOrdersController = async (
  req: Request<
    ParamsDictionary,
    unknown,
    unknown,
    { from: string; to: string; page?: string; limit?: string }
  >,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const from = new Date(req.query.from)
  const to = new Date(req.query.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() >= to.getTime()) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.BAD_REQUEST,
      message: USER_MESSAGES.ORDER_EARNINGS_INVALID_PERIOD
    })
  }
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined

  const { items, meta } = await orderService.getShopEarningsOrders({
    farmerUserId: user_id,
    from,
    to,
    page,
    limit
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SHOP_EARNINGS_ORDERS_SUCCESS,
    data: { items: items.map((o) => mapOrderRow(o as any)), meta }
  })
}

export const getShopOrdersController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetOrdersQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const status = req.query.status as order_status | undefined

  const { items, meta } = await orderService.getShopOrders({
    farmerUserId: user_id,
    page,
    limit,
    status
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_ORDERS_SUCCESS,
    data: { items: items.map((o) => mapOrderRow(o as any)), meta }
  })
}

export const getOrderByIdController = async (req: Request<{ order_id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const order = await orderService.getOrderById({ orderId: req.params.order_id, userId: user_id })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_ORDER_DETAIL_SUCCESS,
    data: mapOrderRow(order as any)
  })
}

export const getPayosResumeController = async (req: Request<{ order_id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const payload = await orderService.getPayosResumeForBuyer({
    orderId: req.params.order_id,
    buyerUserId: user_id
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_PAYOS_RESUME_SUCCESS,
    data: payload
  })
}

export const renewPayosPaymentController = async (req: Request<{ order_id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { order, checkoutUrl } = await orderService.renewPayosPaymentForBuyer({
    orderId: req.params.order_id,
    buyerUserId: user_id
  })

  const row = mapOrderRow(order as any)
  const data = { ...row, checkoutUrl }

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.ORDER_PAYOS_RENEW_SUCCESS,
    data
  })
}

export const cancelOrderController = async (req: Request<{ order_id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const order = await orderService.cancelOrder({ orderId: req.params.order_id, buyerUserId: user_id })
  notificationDispatch.orderCancelledForFarmer(order as any)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CANCEL_ORDER_SUCCESS,
    data: mapOrderRow(order as any)
  })
}

export const updateOrderStatusController = async (
  req: Request<{ order_id: string }, unknown, UpdateOrderStatusBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const order = await orderService.updateOrderStatus({
    orderId: req.params.order_id,
    farmerUserId: user_id,
    nextStatus: req.body.status
  })
  notificationDispatch.orderStatusChangedForBuyer(order as any)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_ORDER_STATUS_SUCCESS,
    data: mapOrderRow(order as any)
  })
}
