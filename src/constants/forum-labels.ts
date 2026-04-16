/** Whitelist label slug — FE dùng cùng danh sách để tránh rác dữ liệu */
export const ALLOWED_FORUM_LABELS = [
  'ky-thuat-trong',
  'phan-bon',
  'sau-benh',
  'tuoi-nuoc',
  'thu-hoach',
  'bao-quan',
  'thi-truong',
  'khac'
] as const

export type ForumLabelSlug = (typeof ALLOWED_FORUM_LABELS)[number]

export const isAllowedForumLabel = (value: string): value is ForumLabelSlug =>
  (ALLOWED_FORUM_LABELS as readonly string[]).includes(value)
