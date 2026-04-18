import type { order_status } from '@prisma/client'
import prisma from '~/lib/prisma'
import notificationService from './notification.service'
import { NotificationEntityType } from './notification.constants'

function safeRun(fn: () => Promise<unknown>) {
  void fn().catch((err) => console.error('[notification-dispatch]', err))
}

async function peerUserIdFromConversation(conversationId: string, senderUserId: string) {
  const c = await prisma.chat_conversations.findUnique({
    where: { id: conversationId },
    select: { participant_1_id: true, participant_2_id: true }
  })
  if (!c) return null
  if (c.participant_1_id === senderUserId) return c.participant_2_id
  if (c.participant_2_id === senderUserId) return c.participant_1_id
  return null
}

function truncate(s: string, max: number) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function orderItemsSummary(orderItems: Array<{ qty: unknown; products: { name: string } }>) {
  const parts = orderItems.map((it) => {
    const q = String(it.qty)
    return `${it.products.name} × ${q}`
  })
  const head = parts.slice(0, 2).join(', ')
  return parts.length > 2 ? `${head}…` : head
}

function buyerStatusMessage(status: order_status): { title: string; body: string } {
  switch (status) {
    case 'confirmed':
      return { title: 'Đơn hàng đã xác nhận', body: 'Nông dân đã xác nhận đơn hàng của bạn.' }
    case 'shipping':
      return { title: 'Đơn hàng đang giao', body: 'Đơn hàng của bạn đang được giao.' }
    case 'delivered':
      return { title: 'Đơn hàng đã giao', body: 'Đơn hàng của bạn đã được giao.' }
    case 'cancelled':
      return { title: 'Đơn hàng đã hủy', body: 'Đơn hàng đã bị hủy.' }
    default:
      return { title: 'Cập nhật đơn hàng', body: `Trạng thái đơn hàng: ${status}.` }
  }
}

type OrderRowForFarmerNotif = {
  id: string
  buyer_user_id: string
  shops?: { farms?: { owner_user_id: string } | null } | null
  order_items: Array<{ qty: unknown; products: { name: string } }>
}

type OrderRowForBuyerNotif = {
  id: string
  buyer_user_id: string
  status: order_status
  shops?: { name?: string | null } | null
}

/**
 * Các hàm gọi sau khi transaction nghiệp vụ đã commit. Lỗi ghi DB không làm fail HTTP.
 * Thêm loại sự kiện: tạo hàm mới tại đây + gọi `notificationService.create`.
 */
export const notificationDispatch = {
  orderCreatedForFarmer(order: OrderRowForFarmerNotif) {
    safeRun(async () => {
      const ownerId = order.shops?.farms?.owner_user_id
      if (!ownerId) return

      const buyer = await prisma.users.findUnique({
        where: { id: order.buyer_user_id },
        select: { full_name: true }
      })
      const buyerName = buyer?.full_name?.trim() || 'Người mua'
      const summary = orderItemsSummary(order.order_items)

      await notificationService.create({
        recipientUserId: ownerId,
        actorUserId: order.buyer_user_id,
        type: 'order',
        title: 'Đơn hàng mới',
        body: `${buyerName} đã đặt: ${summary}`,
        entityType: NotificationEntityType.ORDER,
        entityId: order.id,
        dedupeKey: `order:${order.id}:farmer:new`
      })
    })
  },

  orderCancelledForFarmer(order: {
    id: string
    buyer_user_id: string
    shops?: { farms?: { owner_user_id: string } | null } | null
  }) {
    safeRun(async () => {
      const ownerId = order.shops?.farms?.owner_user_id
      if (!ownerId) return

      const buyer = await prisma.users.findUnique({
        where: { id: order.buyer_user_id },
        select: { full_name: true }
      })
      const buyerName = buyer?.full_name?.trim() || 'Người mua'

      await notificationService.create({
        recipientUserId: ownerId,
        actorUserId: order.buyer_user_id,
        type: 'order',
        title: 'Đơn hàng bị hủy',
        body: `${buyerName} đã hủy đơn hàng.`,
        entityType: NotificationEntityType.ORDER,
        entityId: order.id,
        dedupeKey: `order:${order.id}:farmer:buyer_cancel`
      })
    })
  },

  orderStatusChangedForBuyer(order: OrderRowForBuyerNotif) {
    safeRun(async () => {
      if (order.status === 'pending') return

      const { title, body } = buyerStatusMessage(order.status)
      const shopName = order.shops?.name?.trim()
      const bodyWithShop = shopName ? `${body} (${shopName})` : body

      await notificationService.create({
        recipientUserId: order.buyer_user_id,
        type: 'order',
        title,
        body: bodyWithShop,
        entityType: NotificationEntityType.ORDER,
        entityId: order.id,
        dedupeKey: `order:${order.id}:buyer:status:${order.status}`
      })
    })
  },

  chatMessageForPeer(params: { conversationId: string; senderUserId: string }) {
    safeRun(async () => {
      const peerId = await peerUserIdFromConversation(params.conversationId, params.senderUserId)
      if (!peerId) return

      const sender = await prisma.users.findUnique({
        where: { id: params.senderUserId },
        select: { full_name: true }
      })
      const name = sender?.full_name?.trim() || 'Người dùng'

      await notificationService.create({
        recipientUserId: peerId,
        actorUserId: params.senderUserId,
        type: 'message',
        title: 'Tin nhắn mới',
        body: `${name} đã gửi tin nhắn cho bạn`,
        entityType: NotificationEntityType.CONVERSATION,
        entityId: params.conversationId
      })
    })
  },

  cooperativeJoinRequested(params: {
    cooperativeUserId: string
    farmerUserId: string
    farmId: string
    membershipId: string
  }) {
    safeRun(async () => {
      const [farmer, farm] = await Promise.all([
        prisma.users.findUnique({
          where: { id: params.farmerUserId },
          select: { full_name: true }
        }),
        prisma.farms.findUnique({
          where: { id: params.farmId },
          select: { name: true }
        })
      ])
      const farmerName = farmer?.full_name?.trim() || 'Nông hộ'
      const farmName = farm?.name?.trim() || 'Nông trại'

      await notificationService.create({
        recipientUserId: params.cooperativeUserId,
        actorUserId: params.farmerUserId,
        type: 'cooperative',
        title: 'Yêu cầu tham gia HTX',
        body: `${farmerName} xin tham gia với trang trại "${farmName}".`,
        entityType: NotificationEntityType.COOPERATIVE_MEMBERSHIP,
        entityId: params.membershipId,
        dedupeKey: `coop:${params.membershipId}:request`
      })
    })
  },

  cooperativeApprovedForFarmer(params: { farmerUserId: string; cooperativeUserId: string; farmId: string }) {
    safeRun(async () => {
      const [htx, farm] = await Promise.all([
        prisma.users.findUnique({
          where: { id: params.cooperativeUserId },
          select: { full_name: true }
        }),
        prisma.farms.findUnique({
          where: { id: params.farmId },
          select: { name: true }
        })
      ])
      const htxName = htx?.full_name?.trim() || 'Hợp tác xã'
      const farmName = farm?.name?.trim() || 'Nông trại'

      await notificationService.create({
        recipientUserId: params.farmerUserId,
        actorUserId: params.cooperativeUserId,
        type: 'cooperative',
        title: 'Đã duyệt tham gia HTX',
        body: `${htxName} đã duyệt "${farmName}" là nông hộ quản lý.`,
        entityType: NotificationEntityType.COOPERATIVE_MEMBERSHIP,
        entityId: params.farmId
      })
    })
  },

  cooperativeRejectedForFarmer(params: {
    farmerUserId: string
    cooperativeUserId: string
    farmId: string
    note?: string | null
  }) {
    safeRun(async () => {
      const htx = await prisma.users.findUnique({
        where: { id: params.cooperativeUserId },
        select: { full_name: true }
      })
      const htxName = htx?.full_name?.trim() || 'Hợp tác xã'
      const notePart = params.note && params.note.trim().length > 0 ? ` Lý do: ${truncate(params.note, 120)}` : ''

      await notificationService.create({
        recipientUserId: params.farmerUserId,
        actorUserId: params.cooperativeUserId,
        type: 'cooperative',
        title: 'Yêu cầu HTX bị từ chối',
        body: `${htxName} đã từ chối yêu cầu tham gia.${notePart}`,
        entityType: NotificationEntityType.COOPERATIVE_MEMBERSHIP,
        entityId: params.farmId
      })
    })
  },

  forumNewComment(params: {
    postAuthorUserId: string
    commentAuthorUserId: string
    commentAuthorName: string
    postId: string
    postTitle: string
  }) {
    safeRun(async () => {
      if (params.postAuthorUserId === params.commentAuthorUserId) return

      await notificationService.create({
        recipientUserId: params.postAuthorUserId,
        actorUserId: params.commentAuthorUserId,
        type: 'forum',
        title: 'Bình luận mới',
        body: `${params.commentAuthorName} đã bình luận về "${truncate(params.postTitle, 100)}"`,
        entityType: NotificationEntityType.FORUM_POST,
        entityId: params.postId
      })
    })
  },

  shopReviewNewForFarmer(params: {
    farmerUserId: string
    buyerUserId: string
    buyerName: string
    shopId: string
    shopName: string
    productId: string
    productName: string
    rating: number
    reviewId: string
  }) {
    safeRun(async () => {
      await notificationService.create({
        recipientUserId: params.farmerUserId,
        actorUserId: params.buyerUserId,
        type: 'review',
        title: 'Đánh giá mới',
        body: `${params.buyerName} đã đánh giá ${params.rating} sao cho sản phẩm "${truncate(params.productName, 80)}".`,
        entityType: NotificationEntityType.SHOP_REVIEW,
        entityId: params.productId,
        dedupeKey: `shop_review:${params.reviewId}:notify`,
        metadata: {
          reviewId: params.reviewId,
          shopId: params.shopId,
          productId: params.productId
        }
      })
    })
  }
}
