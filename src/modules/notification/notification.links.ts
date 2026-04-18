import type { user_role } from '@prisma/client'
import { NotificationEntityType } from './notification.constants'

/**
 * Sinh đường dẫn tương đối cho Next app theo vai người xem.
 * Mở rộng: thêm `entity_type` mới + nhánh tại đây (hoặc lưu override trong `metadata`).
 */
export function resolveNotificationDeepLink(params: {
  viewerRole: user_role
  entityType: string | null
  entityId: string | null
}): string | undefined {
  const { viewerRole, entityType, entityId } = params
  if (!entityType || !entityId) return undefined

  if (entityType === NotificationEntityType.ORDER) {
    if (viewerRole === 'consumer') return '/consumer/orders'
    if (viewerRole === 'farmer') return '/farmer/orders'
    return undefined
  }

  if (entityType === NotificationEntityType.CONVERSATION) {
    if (viewerRole === 'consumer') return `/consumer/messages?chat=${entityId}`
    if (viewerRole === 'farmer') return `/farmer/messages?chat=${entityId}`
    return undefined
  }

  if (entityType === NotificationEntityType.COOPERATIVE_MEMBERSHIP) {
    if (viewerRole === 'farmer') return '/farmer/farms'
    if (viewerRole === 'cooperative') return '/cooperative/requests'
    return undefined
  }

  if (entityType === NotificationEntityType.FORUM_POST) {
    if (viewerRole === 'consumer') return '/consumer/forum'
    if (viewerRole === 'farmer') return '/farmer/forum'
    if (viewerRole === 'cooperative') return '/cooperative'
    return undefined
  }

  return undefined
}
