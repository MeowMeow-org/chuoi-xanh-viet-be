import prisma from '~/lib/prisma'
import { isTelegramOutboundConfigured, sendTelegramText } from './telegramBot.service'

type CareStep = {
  stepNo: number
  title: string
  detail: string
  dayOffset: number
  category: string
}

function buildSeasonPlanMessage(params: {
  cropName: string
  seasonCode: string
  steps: CareStep[]
}): string {
  const top = params.steps.slice(0, 8)
  const lines = top.map((s) => `• Ngày +${s.dayOffset}: ${s.title} - ${s.detail}`)
  const more = params.steps.length > top.length ? `\n... và ${params.steps.length - top.length} bước nữa trong kế hoạch mùa vụ.` : ''
  return `【Chuỗi Xanh - Mùa vụ mới】\nMã vụ: ${params.seasonCode}\nCây trồng: ${params.cropName}\n\nCác bước nhắc việc:\n${lines.join('\n')}${more}`.slice(0, 3900)
}

export function notifyFarmerSeasonPlanTelegramSafe(params: {
  recipientUserId: string
  cropName: string
  seasonCode: string
  steps: CareStep[]
}): void {
  if (!isTelegramOutboundConfigured()) return

  void (async () => {
    try {
      const user = await prisma.users.findUnique({
        where: { id: params.recipientUserId },
        select: { role: true, telegram_chat_id: true }
      })
      if (!user || user.role !== 'farmer') return
      const cid = user.telegram_chat_id?.trim()
      if (!cid) return

      const text = buildSeasonPlanMessage(params)
      await sendTelegramText(cid, text)
    } catch (err) {
      console.error('[telegram-season-notify]', err)
    }
  })()
}
