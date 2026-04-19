import prisma from '~/lib/prisma'
import { isZaloOaConfigured, sendZaloOaTextMessage } from './zaloOa.service'

function formatInAppPush(title: string, body: string): string {
  const t = title.trim()
  const b = body.trim()
  return `【Chuỗi Xanh】\n\n${t}\n\n${b}`.trim().slice(0, 2000)
}

/**
 * Sau khi đã ghi thông báo in-app, gửi kèm tin Zalo OA cho nông dân (nếu đã cấu hình và có zalo_user_id).
 * Gọi không await — lỗi chỉ log, không ảnh hưởng API chính.
 */
export function notifyFarmerZaloAfterInAppNotificationSafe(params: {
  recipientUserId: string
  title: string
  body: string
}): void {
  if (!isZaloOaConfigured()) return

  void (async () => {
    try {
      const user = await prisma.users.findUnique({
        where: { id: params.recipientUserId },
        select: { role: true, zalo_user_id: true }
      })
      if (!user || user.role !== 'farmer') return
      const zid = user.zalo_user_id?.trim()
      if (!zid) return

      const text = formatInAppPush(params.title, params.body)
      await sendZaloOaTextMessage(zid, text)
    } catch (err) {
      console.error('[zalo-farmer-notify]', err)
    }
  })()
}
