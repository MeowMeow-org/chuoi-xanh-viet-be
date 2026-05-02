import { Prisma, type order_status } from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateOrderRequestBody } from './order.request'
import { toKg } from '~/utils/unit'
import {
  cancelPayosPaymentByOrderCode,
  createPayosPaymentLink,
  generatePayosOrderCode,
  getPayosPaymentRequestByOrderCode,
  resolvePayosHostedCheckoutUrl
} from './order.payos'

/** PayOS trả lỗi code 20 nếu vượt (xem log: "Mô tả tối đa 25 kí tự"). */
const PAYOS_PAYMENT_DESCRIPTION_MAX_LEN = 25
const PAYOS_ITEM_NAME_MAX_LEN = 25

function clipPayosText(raw: string, maxLen: number): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

type OrderTx = Prisma.TransactionClient

/**
 * Ghi các dòng biến động tồn kho cho danh sách order_items và tự động cập nhật
 * trạng thái sale_units khi cần (sold ↔ active). Hoạt động trong 1 transaction.
 *
 * @param sign  -1: xuất (order), +1: nhập lại (cancel/adjust)
 */
const recordStockMovements = async ({
  tx,
  items,
  orderId,
  source,
  sign
}: {
  tx: OrderTx
  items: Array<{ product_id: string; qty: Prisma.Decimal | number | string }>
  orderId: string | null
  source: 'order' | 'cancel' | 'adjust'
  sign: 1 | -1
}) => {
  for (const it of items) {
    const product = await tx.products.findUnique({
      where: { id: it.product_id },
      select: {
        id: true,
        unit: true,
        stock_qty: true,
        sale_unit_id: true,
        sale_unit: { select: { id: true, status: true, unit: true } }
      }
    })
    if (!product || !product.sale_unit_id || !product.sale_unit) continue

    const productUnit = product.unit ?? product.sale_unit.unit
    const deltaKg = toKg(it.qty, productUnit)
    if (!deltaKg) continue // Không phải đơn vị mass → bỏ qua, không ghi sổ

    const signedKg = sign === 1 ? deltaKg : deltaKg.negated()
    const currentStock = product.stock_qty ?? new Prisma.Decimal(0)
    const balanceAfterKg = toKg(currentStock, productUnit) ?? new Prisma.Decimal(0)

    await tx.stock_movements.create({
      data: {
        sale_unit_id: product.sale_unit_id,
        product_id: product.id,
        order_id: orderId,
        source,
        qty_kg: signedKg,
        balance_after_kg: balanceAfterKg
      }
    })

    // Auto status: hết hàng → sold; nhập lại sau khi đã sold → active
    if (sign === -1) {
      if (currentStock.isZero() && product.sale_unit.status === 'active') {
        await tx.sale_units.update({ where: { id: product.sale_unit_id }, data: { status: 'sold' } })
      }
    } else {
      if (!currentStock.isZero() && product.sale_unit.status === 'sold') {
        await tx.sale_units.update({ where: { id: product.sale_unit_id }, data: { status: 'active' } })
      }
    }
  }
}

const orderItemSelect = {
  id: true,
  order_id: true,
  product_id: true,
  qty: true,
  unit_price: true,
  line_total: true,
  products: {
    select: {
      id: true,
      name: true,
      unit: true,
      image_url: true
    }
  }
} as const

const orderSelect = {
  id: true,
  buyer_user_id: true,
  shop_id: true,
  status: true,
  payment_method: true,
  payment_status: true,
  total_amount: true,
  shipping_name: true,
  shipping_phone: true,
  shipping_address: true,
  note: true,
  created_at: true,
  updated_at: true,
  shops: {
    select: {
      id: true,
      name: true,
      is_verified: true,
      farms: {
        select: {
          id: true,
          name: true,
          owner_user_id: true,
          province: true,
          district: true,
          ward: true
        }
      }
    }
  },
  order_items: {
    select: orderItemSelect
  }
} as const

export type OrderSelected = Prisma.ordersGetPayload<{ select: typeof orderSelect }>

/**
 * Chi tiết dòng hàng trên PayOS/VietQR: tên sản phẩm thật + (tuỳ chọn) phí ship,
 * sao cho tổng quantity × price = amountVnd.
 */
function buildPayosItemsFromOrder(
  order: OrderSelected,
  amountVnd: number
): Array<{ name: string; quantity: number; price: number }> {
  const rows = order.order_items ?? []
  if (rows.length === 0) {
    return [
      {
        name: clipPayosText('Don hang', PAYOS_ITEM_NAME_MAX_LEN),
        quantity: 1,
        price: amountVnd
      }
    ]
  }

  const items: Array<{ name: string; quantity: number; price: number }> = []
  let sumLines = 0
  for (const it of rows) {
    const title = clipPayosText(it.products?.name ?? 'San pham', PAYOS_ITEM_NAME_MAX_LEN)
    const quantity = Math.max(1, Math.round(Number(it.qty)))
    const price = Math.round(Number(it.unit_price))
    sumLines += quantity * price
    items.push({ name: title, quantity, price })
  }

  const shipping = amountVnd - sumLines
  if (shipping > 0) {
    items.push({
      name: clipPayosText('Van chuyen', PAYOS_ITEM_NAME_MAX_LEN),
      quantity: 1,
      price: shipping
    })
  } else if (shipping < 0) {
    const primary = clipPayosText(rows[0]?.products?.name ?? 'Don hang', PAYOS_ITEM_NAME_MAX_LEN)
    return [{ name: primary, quantity: 1, price: amountVnd }]
  }

  return items
}

class OrderService {
  /**
   * Hủy đơn pending + hoàn tồn (PayOS lỗi tạo link / webhook thất bại / hệ thống).
   */
  voidPendingOrderAndRestoreStock = async (orderId: string) => {
    await prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          order_items: { select: { product_id: true, qty: true } }
        }
      })
      if (!order || order.status !== 'pending') return

      for (const it of order.order_items) {
        await tx.products.update({
          where: { id: it.product_id },
          data: { stock_qty: { increment: it.qty } }
        })
      }

      await recordStockMovements({
        tx,
        items: order.order_items,
        orderId: order.id,
        source: 'cancel',
        sign: 1
      })

      await tx.orders.update({
        where: { id: orderId },
        data: { status: 'cancelled', payment_status: 'failed', updated_at: new Date() }
      })
    })
  }

  handlePayosWebhook = async (data: { orderCode: number; amount: number; code: string }) => {
    const stringOrderCode = String(data.orderCode)
    const order = await prisma.orders.findFirst({
      where: { payos_order_code: stringOrderCode },
      select: {
        id: true,
        total_amount: true,
        payment_status: true,
        status: true,
        payment_method: true
      }
    })

    if (!order) {
      console.error(`PayOS webhook: không tìm thấy đơn orderCode=${stringOrderCode}`)
      return
    }
    if (order.payment_method !== 'payos') {
      console.error(`PayOS webhook: đơn ${order.id} không phải payos`)
      return
    }

    if (data.code === '00') {
      if (order.payment_status === 'paid') return
      const expected = Math.round(Number(order.total_amount))
      if (expected !== data.amount) {
        console.error(`PayOS webhook: sai số tiền đơn ${order.id}`, expected, data.amount)
        return
      }
      await prisma.orders.update({
        where: { id: order.id },
        data: { payment_status: 'paid', updated_at: new Date() }
      })
      return
    }

    if (order.status === 'pending' && order.payment_status === 'pending') {
      await this.voidPendingOrderAndRestoreStock(order.id)
    }
  }

  createOrder = async ({ buyerUserId, payload }: { buyerUserId: string; payload: CreateOrderRequestBody }) => {
    const { shop_id, items, shipping_name, shipping_phone, shipping_address, payment_method, note } = payload

    if (items.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_ITEMS_REQUIRED
      })
    }

    // Collapse duplicates (same product_id → sum qty)
    const mergedMap = new Map<string, number>()
    for (const it of items) {
      mergedMap.set(it.product_id, (mergedMap.get(it.product_id) ?? 0) + Number(it.qty))
    }
    const mergedItems = Array.from(mergedMap.entries()).map(([product_id, qty]) => ({ product_id, qty }))

    const created = await prisma.$transaction(async (tx) => {
      const shop = await tx.shops.findUnique({
        where: { id: shop_id },
        select: { id: true, status: true }
      })
      if (!shop || shop.status !== 'open') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.ORDER_PRODUCT_NOT_AVAILABLE
        })
      }

      const productRows = await tx.products.findMany({
        where: {
          id: { in: mergedItems.map((i) => i.product_id) },
          shop_id,
          is_active: true
        },
        select: { id: true, price: true, stock_qty: true }
      })

      if (productRows.length !== mergedItems.length) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.ORDER_ITEMS_SAME_SHOP
        })
      }

      const productById = new Map(productRows.map((p) => [p.id, p]))
      let totalAmount = new Prisma.Decimal(0)
      const itemsToCreate: Prisma.order_itemsCreateManyOrdersInput[] = []

      for (const it of mergedItems) {
        const prod = productById.get(it.product_id)!
        const qty = new Prisma.Decimal(it.qty)
        const stock = prod.stock_qty ?? new Prisma.Decimal(0)
        if (stock.lessThan(qty)) {
          throw new ErrorWithStatus({
            status: HTTP_STATUS.CONFLICT,
            message: USER_MESSAGES.ORDER_INSUFFICIENT_STOCK
          })
        }
        const unitPrice = prod.price
        const lineTotal = unitPrice.mul(qty)
        totalAmount = totalAmount.add(lineTotal)
        itemsToCreate.push({
          product_id: prod.id,
          qty,
          unit_price: unitPrice,
          line_total: lineTotal
        })
      }

      // Decrement stock with conditional check per product (defence in depth)
      for (const it of mergedItems) {
        const updated = await tx.products.updateMany({
          where: {
            id: it.product_id,
            stock_qty: { gte: new Prisma.Decimal(it.qty) }
          },
          data: {
            stock_qty: { decrement: new Prisma.Decimal(it.qty) }
          }
        })
        if (updated.count === 0) {
          throw new ErrorWithStatus({
            status: HTTP_STATUS.CONFLICT,
            message: USER_MESSAGES.ORDER_INSUFFICIENT_STOCK
          })
        }
      }

      const order = await tx.orders.create({
        data: {
          buyer_user_id: buyerUserId,
          shop_id,
          status: 'pending',
          payment_method,
          payment_status: 'pending',
          total_amount: totalAmount,
          shipping_name,
          shipping_phone,
          shipping_address,
          note,
          order_items: {
            createMany: { data: itemsToCreate }
          }
        },
        select: orderSelect
      })

      await recordStockMovements({
        tx,
        items: mergedItems,
        orderId: order.id,
        source: 'order',
        sign: -1
      })

      return order
    })

    if (payment_method !== 'payos') {
      return { order: created, checkoutUrl: undefined }
    }

    const amountVnd = Math.round(Number(created.total_amount))
    if (amountVnd < 2000) {
      await this.voidPendingOrderAndRestoreStock(created.id)
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_PAYOS_MIN_AMOUNT
      })
    }

    const orderCode = generatePayosOrderCode()
    const baseUrl = (
      process.env.PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '')
    const returnUrl = `${baseUrl}/consumer/orders/${created.id}`
    const cancelUrl = `${baseUrl}/consumer/cart`
    const shopLabel = created.shops?.name ?? 'Gian hàng'
    const firstProductName = created.order_items?.[0]?.products?.name
    const payosDescription = clipPayosText(
      firstProductName && firstProductName.length > 0 ? firstProductName : `DH ${shopLabel}`,
      PAYOS_PAYMENT_DESCRIPTION_MAX_LEN
    )
    const payosItems = buildPayosItemsFromOrder(created, amountVnd)

    try {
      const linkResp = await createPayosPaymentLink({
        orderCode,
        amount: amountVnd,
        description: payosDescription,
        returnUrl,
        cancelUrl,
        items: payosItems
      })

      const refreshed = await prisma.orders.update({
        where: { id: created.id },
        data: { payos_order_code: String(orderCode), updated_at: new Date() },
        select: orderSelect
      })

      return { order: refreshed, checkoutUrl: linkResp.checkoutUrl }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('PayOS createPaymentLink failed', msg, err)
      await this.voidPendingOrderAndRestoreStock(created.id)
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_GATEWAY,
        message: USER_MESSAGES.ORDER_PAYOS_LINK_FAILED
      })
    }
  }

  getMyOrders = async ({
    buyerUserId,
    page = 1,
    limit = 20,
    status
  }: {
    buyerUserId: string
    page?: number
    limit?: number
    status?: order_status
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const where: Prisma.ordersWhereInput = {
      buyer_user_id: buyerUserId,
      ...(status ? { status } : {})
    }

    const [items, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: orderSelect
      }),
      prisma.orders.count({ where })
    ])

    const orderIds = items.map((i) => i.id)
    const myReviews =
      orderIds.length > 0
        ? await prisma.shop_reviews.findMany({
            where: { user_id: buyerUserId, order_id: { in: orderIds } },
            select: {
              id: true,
              order_id: true,
              product_id: true,
              rating: true,
              comment: true
            }
          })
        : []
    const reviewByOrderProduct = new Map<string, Map<string, { id: string; rating: number; comment: string | null }>>()
    for (const r of myReviews) {
      if (!reviewByOrderProduct.has(r.order_id)) {
        reviewByOrderProduct.set(r.order_id, new Map())
      }
      reviewByOrderProduct.get(r.order_id)!.set(r.product_id, {
        id: r.id,
        rating: r.rating,
        comment: r.comment
      })
    }

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items: items.map((o) => {
        const byProduct = reviewByOrderProduct.get(o.id)
        return {
          ...o,
          order_items: o.order_items.map((it) => ({
            ...it,
            my_review: byProduct?.get(it.product_id) ?? null
          }))
        }
      }),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  getShopOrders = async ({
    farmerUserId,
    page = 1,
    limit = 20,
    status
  }: {
    farmerUserId: string
    page?: number
    limit?: number
    status?: order_status
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const where: Prisma.ordersWhereInput = {
      shops: { farms: { owner_user_id: farmerUserId } },
      ...(status ? { status } : {})
    }

    const [items, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: orderSelect
      }),
      prisma.orders.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  getOrderById = async ({ orderId, userId }: { orderId: string; userId: string }) => {
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: orderSelect
    })

    if (!order) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.ORDER_NOT_FOUND
      })
    }

    const isBuyer = order.buyer_user_id === userId
    const isShopOwner = order.shops?.farms?.owner_user_id === userId
    if (!isBuyer && !isShopOwner) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.ORDER_FORBIDDEN
      })
    }

    if (!isBuyer) {
      return order
    }

    const myReviewRows = await prisma.shop_reviews.findMany({
      where: { order_id: orderId, user_id: userId },
      select: {
        id: true,
        product_id: true,
        rating: true,
        comment: true
      }
    })
    const byProduct = new Map(
      myReviewRows.map((r) => [
        r.product_id,
        { id: r.id, rating: r.rating, comment: r.comment }
      ])
    )

    return {
      ...order,
      order_items: order.order_items.map((it) => ({
        ...it,
        my_review: byProduct.get(it.product_id) ?? null
      }))
    }
  }

  /** Lấy lại checkoutUrl/qrCode từ PayOS khi khách đóng tab thanh toán (đơn vẫn pending). */
  getPayosResumeForBuyer = async ({
    orderId,
    buyerUserId
  }: {
    orderId: string
    buyerUserId: string
  }) => {
    const order = await prisma.orders.findFirst({
      where: { id: orderId, buyer_user_id: buyerUserId },
      select: {
        id: true,
        payment_method: true,
        payment_status: true,
        status: true,
        payos_order_code: true
      }
    })

    if (!order) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.ORDER_NOT_FOUND
      })
    }
    if (order.payment_method !== 'payos') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_PAYOS_RESUME_NOT_APPLICABLE
      })
    }
    if (order.payment_status !== 'pending' || order.status !== 'pending') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_PAYOS_RESUME_NOT_PENDING
      })
    }
    const codeRaw = order.payos_order_code?.trim()
    if (!codeRaw) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_PAYOS_RESUME_NO_CODE
      })
    }
    const orderCode = Number(codeRaw)
    if (!Number.isFinite(orderCode)) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ORDER_PAYOS_RESUME_NO_CODE
      })
    }

    try {
      const pr = await getPayosPaymentRequestByOrderCode(orderCode)
      const status = String(pr.status ?? '').toUpperCase()
      if (
        status === 'CANCELLED' ||
        status === 'EXPIRED' ||
        status === 'FAILED'
      ) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.ORDER_PAYOS_RESUME_LINK_DEAD
        })
      }
      if (status === 'PAID') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.ORDER_PAYOS_RESUME_NOT_PENDING
        })
      }
      const checkoutUrl = resolvePayosHostedCheckoutUrl(pr) ?? ''
      const qrCode = typeof pr.qrCode === 'string' ? pr.qrCode.trim() : ''
      if (!checkoutUrl && !qrCode) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_GATEWAY,
          message: USER_MESSAGES.ORDER_PAYOS_RESUME_FETCH_FAILED
        })
      }
      return {
        checkoutUrl: checkoutUrl || undefined,
        qrCode: qrCode || undefined,
        payosStatus: pr.status
      }
    } catch (e) {
      if (e instanceof ErrorWithStatus) throw e
      console.error('PayOS get payment request failed', e)
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_GATEWAY,
        message: USER_MESSAGES.ORDER_PAYOS_RESUME_FETCH_FAILED
      })
    }
  }

  cancelOrder = async ({ orderId, buyerUserId }: { orderId: string; buyerUserId: string }) => {
    const existing = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        buyer_user_id: true,
        status: true,
        payment_method: true,
        payment_status: true,
        payos_order_code: true
      }
    })

    if (!existing) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.ORDER_NOT_FOUND
      })
    }
    if (existing.buyer_user_id !== buyerUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.ORDER_FORBIDDEN
      })
    }
    if (existing.status !== 'pending') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.ORDER_CANNOT_CANCEL
      })
    }
    if (existing.payment_method === 'payos' && existing.payment_status === 'paid') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.ORDER_CANNOT_CANCEL_AFTER_PAYMENT
      })
    }

    if (
      existing.payment_method === 'payos' &&
      existing.payos_order_code &&
      existing.payment_status === 'pending'
    ) {
      try {
        await cancelPayosPaymentByOrderCode(existing.payos_order_code)
      } catch (e) {
        console.warn('PayOS cancel (buyer):', e)
      }
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyer_user_id: true,
          status: true,
          order_items: { select: { product_id: true, qty: true } }
        }
      })

      if (!order || order.buyer_user_id !== buyerUserId || order.status !== 'pending') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.ORDER_CANNOT_CANCEL
        })
      }

      for (const it of order.order_items) {
        await tx.products.update({
          where: { id: it.product_id },
          data: { stock_qty: { increment: it.qty } }
        })
      }

      await recordStockMovements({
        tx,
        items: order.order_items,
        orderId: order.id,
        source: 'cancel',
        sign: 1
      })

      const updated = await tx.orders.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
        select: orderSelect
      })
      return updated
    })
  }

  updateOrderStatus = async ({
    orderId,
    farmerUserId,
    nextStatus
  }: {
    orderId: string
    farmerUserId: string
    nextStatus: order_status
  }) => {
    const pre = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        payment_method: true,
        payment_status: true,
        payos_order_code: true,
        shops: { select: { farms: { select: { owner_user_id: true } } } }
      }
    })

    if (!pre) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.ORDER_NOT_FOUND
      })
    }
    if (pre.shops.farms.owner_user_id !== farmerUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.ORDER_FORBIDDEN
      })
    }

    const allowed: Record<order_status, order_status[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipping', 'cancelled'],
      shipping: ['delivered'],
      delivered: [],
      cancelled: []
    }

    if (!allowed[pre.status].includes(nextStatus)) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.ORDER_INVALID_STATUS_TRANSITION
      })
    }

    if (
      nextStatus === 'cancelled' &&
      pre.payment_method === 'payos' &&
      pre.payos_order_code &&
      pre.payment_status === 'pending'
    ) {
      try {
        await cancelPayosPaymentByOrderCode(pre.payos_order_code)
      } catch (e) {
        console.warn('PayOS cancel (farmer):', e)
      }
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          payment_method: true,
          payment_status: true,
          shops: { select: { farms: { select: { owner_user_id: true } } } },
          order_items: { select: { product_id: true, qty: true } }
        }
      })

      if (!order) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.NOT_FOUND,
          message: USER_MESSAGES.ORDER_NOT_FOUND
        })
      }
      if (order.shops.farms.owner_user_id !== farmerUserId) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: USER_MESSAGES.ORDER_FORBIDDEN
        })
      }

      if (!allowed[order.status].includes(nextStatus)) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.ORDER_INVALID_STATUS_TRANSITION
        })
      }

      if (
        nextStatus === 'confirmed' &&
        order.payment_method === 'payos' &&
        order.payment_status !== 'paid'
      ) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.ORDER_PAYOS_CONFIRM_REQUIRES_PAID
        })
      }

      if (nextStatus === 'cancelled') {
        for (const it of order.order_items) {
          await tx.products.update({
            where: { id: it.product_id },
            data: { stock_qty: { increment: it.qty } }
          })
        }
        await recordStockMovements({
          tx,
          items: order.order_items,
          orderId: order.id,
          source: 'cancel',
          sign: 1
        })
      }

      const extraData: Prisma.ordersUncheckedUpdateInput = { status: nextStatus }
      if (nextStatus === 'delivered' && order.payment_method === 'cod') {
        extraData.payment_status = 'paid'
      }

      return tx.orders.update({
        where: { id: orderId },
        data: extraData,
        select: orderSelect
      })
    })
  }
}

const orderService = new OrderService()
export default orderService
