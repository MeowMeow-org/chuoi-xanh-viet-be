import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import orderService from './order.service'
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
      }
    })) ?? []
})

export const createOrderController = async (
  req: Request<ParamsDictionary, unknown, CreateOrderRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const order = await orderService.createOrder({ buyerUserId: user_id, payload: req.body })
  notificationDispatch.orderCreatedForFarmer(order as any)

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_ORDER_SUCCESS,
    data: mapOrderRow(order as any)
  })
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
