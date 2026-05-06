import type { Prisma, user_role } from '@prisma/client'

import prisma from '~/lib/prisma'
import { isTelegramOutboundConfigured, sendTelegramText } from './telegramBot.service'

/** Hàng chỉ có role + telegram_chat_id; kiểu tường minh để TS ổn khi IDE dùng Prisma Client chưa `generate` lại. */
type FarmerTelegramNotifyRow = {
  role: user_role
  telegram_chat_id: string | null
}

function formatPush(title: string, body: string): string {
  const t = title.trim()
  const b = body.trim()
  return `【Chuỗi Xanh】\n\n${t}\n\n${b}`.trim().slice(0, 3900)
}

/**
 * Sau khi ghi thông báo in-app, gửi kèm Telegram cho nông dân (nếu BE bật TELEGRAM_* và user có telegram_chat_id).
 */
export function notifyFarmerTelegramAfterInAppNotificationSafe(params: {
  recipientUserId: string
  title: string
  body: string
}): void {
  if (!isTelegramOutboundConfigured()) return

  void (async () => {
    try {
      const user = (await prisma.users.findUnique({
        where: { id: params.recipientUserId },
        select: {
          role: true,
          telegram_chat_id: true
        } as unknown as Prisma.usersSelect
      })) as FarmerTelegramNotifyRow | null
      if (!user || user.role !== 'farmer') return
      const cid = user.telegram_chat_id?.trim()
      if (!cid) return

      const text = formatPush(params.title, params.body)
      await sendTelegramText(cid, text)
    } catch (err) {
      console.error('[telegram-farmer-notify]', err)
    }
  })()
}
