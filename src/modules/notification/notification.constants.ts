/** Giá trị `entity_type` — dùng chung cho deep link & lọc phía client */
export const NotificationEntityType = {
  ORDER: 'order',
  CONVERSATION: 'conversation',
  COOPERATIVE_MEMBERSHIP: 'cooperative_membership',
  FORUM_POST: 'forum_post',
  SHOP_REVIEW: 'shop_review',
  FARM_CERTIFICATE: 'farm_certificate',
  COOP_CERTIFICATE: 'coop_certificate'
} as const

export type NotificationEntityTypeValue = (typeof NotificationEntityType)[keyof typeof NotificationEntityType]
