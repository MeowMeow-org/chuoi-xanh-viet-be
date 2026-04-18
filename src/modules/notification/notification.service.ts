import type { notification_type, user_role } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { resolveNotificationDeepLink } from './notification.links'

export type NotificationCreateInput = {
  recipientUserId: string
  actorUserId?: string | null
  type: notification_type
  title: string
  body: string
  entityType?: string | null
  entityId?: string | null
  dedupeKey?: string | null
  metadata?: Prisma.InputJsonValue | null
}

const rowSelect = {
  id: true,
  recipient_user_id: true,
  actor_user_id: true,
  type: true,
  title: true,
  body: true,
  entity_type: true,
  entity_id: true,
  read_at: true,
  created_at: true
} as const

function mapRow(
  row: {
    id: string
    recipient_user_id: string
    actor_user_id: string | null
    type: notification_type
    title: string
    body: string
    entity_type: string | null
    entity_id: string | null
    read_at: Date | null
    created_at: Date
  },
  viewerRole: user_role
) {
  const link = resolveNotificationDeepLink({
    viewerRole,
    entityType: row.entity_type,
    entityId: row.entity_id
  })

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.body,
    read: row.read_at != null,
    readAt: row.read_at,
    createdAt: row.created_at,
    actorUserId: row.actor_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    link
  }
}

class NotificationService {
  /**
   * Tạo thông báo. Khi có `dedupeKey`, trùng (recipient + key) sẽ bỏ qua (idempotent).
   */
  async create(input: NotificationCreateInput): Promise<boolean> {
    const data: Prisma.user_notificationsCreateManyInput = {
      recipient_user_id: input.recipientUserId,
      actor_user_id: input.actorUserId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      dedupe_key: input.dedupeKey ?? null,
      metadata: input.metadata ?? undefined
    }

    if (input.dedupeKey) {
      const { count } = await prisma.user_notifications.createMany({
        data: [data],
        skipDuplicates: true
      })
      return count > 0
    }

    await prisma.user_notifications.create({ data })
    return true
  }

  async listForUser(params: {
    userId: string
    viewerRole: user_role
    page?: number
    limit?: number
    unreadOnly?: boolean
  }) {
    const safePage = Math.max(1, params.page ?? 1)
    const safeLimit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (safePage - 1) * safeLimit

    const baseWhere: Prisma.user_notificationsWhereInput = {
      recipient_user_id: params.userId,
      ...(params.unreadOnly ? { read_at: null } : {})
    }

    const [items, totalFiltered, unreadTotal] = await Promise.all([
      prisma.user_notifications.findMany({
        where: baseWhere,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: rowSelect
      }),
      prisma.user_notifications.count({ where: baseWhere }),
      prisma.user_notifications.count({
        where: { recipient_user_id: params.userId, read_at: null }
      })
    ])

    const totalPages = Math.ceil(totalFiltered / safeLimit)

    return {
      items: items.map((r) => mapRow(r, params.viewerRole)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total: totalFiltered,
        unreadTotal,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  async markRead(notificationId: string, userId: string) {
    const updated = await prisma.user_notifications.updateMany({
      where: { id: notificationId, recipient_user_id: userId, read_at: null },
      data: { read_at: new Date() }
    })

    if (updated.count === 0) {
      const exists = await prisma.user_notifications.findFirst({
        where: { id: notificationId, recipient_user_id: userId },
        select: { id: true }
      })
      if (!exists) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.NOT_FOUND,
          message: USER_MESSAGES.NOTIFICATION_NOT_FOUND
        })
      }
    }

    return { success: true as const }
  }

  async markAllRead(userId: string) {
    await prisma.user_notifications.updateMany({
      where: { recipient_user_id: userId, read_at: null },
      data: { read_at: new Date() }
    })
    return { success: true as const }
  }
}

const notificationService = new NotificationService()
export default notificationService
