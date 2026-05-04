import type { user_role } from '@prisma/client'
import { NotificationEntityType } from './notification.constants'

function linkPathFromMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  const raw = (metadata as Record<string, unknown>).linkPath
  if (typeof raw !== 'string' || raw.length === 0) return undefined
  const p = raw.trim()
  if (p.startsWith('/')) return p
  return `/${p}`
}

function farmIdFromNotificationMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined
  const id = (metadata as Record<string, unknown>).farmId
  return typeof id === 'string' && id.length > 0 ? id : undefined
}

/**
 * Sinh đường dẫn tương đối cho Next app theo vai người xem.
 * Mở rộng: thêm `entity_type` mới + nhánh tại đây (hoặc lưu override trong `metadata`).
 */
export function resolveNotificationDeepLink(params: {
  viewerRole: user_role
  entityType: string | null
  entityId: string | null
  metadata?: unknown
}): string | undefined {
  const { viewerRole, entityType, entityId, metadata } = params

  if (entityType === NotificationEntityType.SYSTEM_BROADCAST) {
    const fromMeta = linkPathFromMetadata(metadata)
    if (fromMeta) return fromMeta
    if (viewerRole === 'admin') return '/admin'
    if (viewerRole === 'consumer') return '/consumer'
    if (viewerRole === 'farmer') return '/farmer'
    if (viewerRole === 'cooperative') return '/cooperative'
    return '/'
  }

  if (!entityType || !entityId) return undefined

  if (entityType === NotificationEntityType.ORDER) {
    if (viewerRole === 'consumer') return '/consumer/orders'
    if (viewerRole === 'farmer') return '/farmer/orders'
    return undefined
  }

  if (entityType === NotificationEntityType.CONVERSATION) {
    if (viewerRole === 'consumer') return `/consumer/messages?c=${entityId}`
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

  if (entityType === NotificationEntityType.SHOP_REVIEW) {
    if (viewerRole === 'farmer') return '/farmer/marketplace?tab=reviews'
    if (viewerRole === 'consumer') return `/consumer/product/${entityId}`
    if (viewerRole === 'admin') return '/admin'
    return undefined
  }

  if (entityType === NotificationEntityType.FARM_CERTIFICATE) {
    if (viewerRole === 'farmer') {
      const farmId = farmIdFromNotificationMetadata(metadata)
      if (farmId) return `/farmer/farms/${farmId}/seasons`
      return '/farmer/certificates'
    }
    const certQ = `highlightFarmCert=${encodeURIComponent(entityId)}`
    if (viewerRole === 'cooperative') {
      return `/cooperative/certificates?tab=pending&${certQ}`
    }
    if (viewerRole === 'admin') {
      return `/admin/certificates?${certQ}`
    }
    return undefined
  }

  if (entityType === NotificationEntityType.COOP_CERTIFICATE) {
    if (viewerRole === 'cooperative') return '/cooperative/certificates'
    if (viewerRole === 'admin') return '/admin/certificates'
    return undefined
  }

  if (entityType === NotificationEntityType.SEASON_INSPECTION_DUE) {
    if (viewerRole === 'cooperative') return '/cooperative/inspections'
    if (viewerRole === 'admin') return '/admin'
    return undefined
  }

  if (viewerRole === 'admin') {
    return '/admin'
  }

  return undefined
}
