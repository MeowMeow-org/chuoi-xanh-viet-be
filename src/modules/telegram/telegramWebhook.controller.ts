import { Request, Response } from 'express'
import { sendTelegramTextUsingBotToken } from './telegramBot.service'
import { redeemTelegramStartPayload } from './telegramLink.service'

function webhookSecretOk(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (!secret) return true
  return req.get('x-telegram-bot-api-secret-token') === secret
}

function parseOutgoingChatAndText(body: unknown): { chatId: string; text: string } | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const msg = o.message
  if (!msg || typeof msg !== 'object') return null
  const m = msg as Record<string, unknown>
  const chat = m.chat as Record<string, unknown> | undefined
  const chatId = chat?.id
  const text = m.text
  if (chatId === undefined || chatId === null) return null
  if (typeof text !== 'string') return null
  return { chatId: String(chatId), text }
}

/** Trả payload sau /start (Telegram có thể gửi "/start TOKEN" một chuỗi). */
function extractStartPayload(text: string): string | null {
  const t = text.trim()
  const m = /^\/start(?:\s+(\S+))?$/.exec(t)
  if (!m) return null
  return m[1] ?? ''
}

/**
 * Telegram gửi JSON Update. Chỉ xử lý private /start (+ deep link payload).
 */
export const telegramWebhookController = async (req: Request, res: Response): Promise<Response> => {
  if (!webhookSecretOk(req)) {
    return res.sendStatus(401)
  }

  try {
    const parsed = parseOutgoingChatAndText(req.body)
    if (parsed) {
      const startPayload = extractStartPayload(parsed.text)
      if (startPayload !== null) {
        if (startPayload === '') {
          await sendTelegramTextUsingBotToken(
            parsed.chatId,
            'Chào bạn 👋 Để nhận thông báo từ Chuỗi Xanh Việt, hãy mở ứng dụng/web nông dân → Hồ sơ → nút «Mở Telegram nhận thông báo», sau đó bấm nút Start theo đường link.'
          ).catch(() => {})
        } else {
          const result = await redeemTelegramStartPayload(startPayload, parsed.chatId)
          if (result.ok) {
            await sendTelegramTextUsingBotToken(
              parsed.chatId,
              'Đã liên kết Chuỗi Xanh Việt. Bạn sẽ nhận thông báo đơn hàng và tin nhắn ở đây.'
            ).catch(() => {})
          } else if (result.reason === 'unknown_token' || result.reason === 'expired') {
            await sendTelegramTextUsingBotToken(
              parsed.chatId,
              'Liên kết hết hạn hoặc không đúng. Mở lại app Chuỗi Xanh → Hồ sơ → «Mở Telegram nhận thông báo» để lấy link mới (hiệu lực khoảng 15 phút).'
            ).catch(() => {})
          }
        }
      }
    }
  } catch (e) {
    console.error('[telegram-webhook]', e)
  }

  return res.sendStatus(200)
}
