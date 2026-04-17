import type { order_status, payment_method } from '@prisma/client'

export interface OrderItemInput {
  product_id: string
  qty: number
}

export interface CreateOrderRequestBody {
  shop_id: string
  items: OrderItemInput[]
  shipping_name: string
  shipping_phone: string
  shipping_address: string
  payment_method: payment_method
  note?: string
}

export interface GetOrdersQuery {
  page?: string
  limit?: string
  status?: order_status
}

export interface UpdateOrderStatusBody {
  status: order_status
}
