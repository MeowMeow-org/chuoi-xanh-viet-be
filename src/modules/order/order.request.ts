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
  /** Địa chỉ giao hàng dạng text gộp (legacy / fallback). Server tự build lại nếu thiếu. */
  shipping_address?: string
  /** Code hành chính theo provinces.open-api.vn */
  shipping_province_code?: number
  shipping_district_code?: number
  shipping_ward_code?: number
  shipping_province_name?: string
  shipping_district_name?: string
  shipping_ward_name?: string
  /** Số nhà / đường (không lặp tỉnh-quận-xã). */
  shipping_detail?: string
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
