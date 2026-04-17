import { Prisma, type order_status } from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateOrderRequestBody } from './order.request'

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

class OrderService {
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

    return prisma.$transaction(async (tx) => {
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

      return order
    })
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

    return order
  }

  cancelOrder = async ({ orderId, buyerUserId }: { orderId: string; buyerUserId: string }) => {
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
      if (order.status !== 'pending') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.ORDER_CANNOT_CANCEL
        })
      }

      // Restore stock
      for (const it of order.order_items) {
        await tx.products.update({
          where: { id: it.product_id },
          data: { stock_qty: { increment: it.qty } }
        })
      }

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
    return prisma.$transaction(async (tx) => {
      const order = await tx.orders.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
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

      const allowed: Record<order_status, order_status[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['shipping', 'cancelled'],
        shipping: ['delivered'],
        delivered: [],
        cancelled: []
      }

      if (!allowed[order.status].includes(nextStatus)) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.CONFLICT,
          message: USER_MESSAGES.ORDER_INVALID_STATUS_TRANSITION
        })
      }

      // Restore stock if farmer cancels pending/confirmed orders
      if (nextStatus === 'cancelled') {
        for (const it of order.order_items) {
          await tx.products.update({
            where: { id: it.product_id },
            data: { stock_qty: { increment: it.qty } }
          })
        }
      }

      // Mark paid for COD when delivered
      const extraData: Prisma.ordersUncheckedUpdateInput = { status: nextStatus }
      if (nextStatus === 'delivered') {
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
