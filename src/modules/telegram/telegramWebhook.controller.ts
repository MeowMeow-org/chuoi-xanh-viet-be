import { Request, Response } from 'express'
import { answerTelegramCallbackQueryUsingBotToken, sendTelegramTextUsingBotToken } from './telegramBot.service'
import { redeemTelegramStartPayload } from './telegramLink.service'
import { telegramDiaryWizardService } from './telegramDiaryWizard.service'

function webhookSecretOk(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (!secret) return true
  return req.get('x-telegram-bot-api-secret-token') === secret
}

function parseIncomingMessage(body: unknown): { chatId: string; text?: string; photoFileId?: string } | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const msg = o.message
  if (!msg || typeof msg !== 'object') return null
  const m = msg as Record<string, unknown>
  const chat = m.chat as Record<string, unknown> | undefined
  const chatId = chat?.id
  if (chatId === undefined || chatId === null) return null

  const text = typeof m.text === 'string' ? m.text : undefined
  let photoFileId: string | undefined
  if (Array.isArray(m.photo) && m.photo.length > 0) {
    const last = m.photo[m.photo.length - 1]
    if (last && typeof last === 'object' && 'file_id' in last) {
      const fid = (last as Record<string, unknown>).file_id
      if (typeof fid === 'string' && fid.trim() !== '') {
        photoFileId = fid.trim()
      }
    }
  }
  return { chatId: String(chatId), text, photoFileId }
}

function parseIncomingCallback(body: unknown): {
  chatId: string
  callbackData: string
  callbackQueryId: string
  messageId?: number
} | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const q = o.callback_query
  if (!q || typeof q !== 'object') return null
  const cq = q as Record<string, unknown>
  const id = cq.id
  const data = cq.data
  const msg = cq.message
  if (typeof id !== 'string' || typeof data !== 'string') return null
  if (!msg || typeof msg !== 'object') return null
  const m = msg as Record<string, unknown>
  const chat = m.chat as Record<string, unknown> | undefined
  const chatId = chat?.id
  if (chatId === undefined || chatId === null) return null
  const messageIdRaw = m.message_id
  const messageId = typeof messageIdRaw === 'number' ? messageIdRaw : undefined
  return { chatId: String(chatId), callbackData: data, callbackQueryId: id, messageId }
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
    const cb = parseIncomingCallback(req.body)
    if (cb) {
      await telegramDiaryWizardService.handleIncoming({
        chatId: cb.chatId,
        callbackData: cb.callbackData,
        callbackMessageId: cb.messageId
      })
      await answerTelegramCallbackQueryUsingBotToken(cb.callbackQueryId).catch(() => {})
      return res.sendStatus(200)
    }

    const parsed = parseIncomingMessage(req.body)
    if (parsed) {
      const startPayload = parsed.text ? extractStartPayload(parsed.text) : null
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
      } else {
        await telegramDiaryWizardService.handleIncoming({
          chatId: parsed.chatId,
          text: parsed.text,
          photoFileId: parsed.photoFileId
        })
      }
    }
  } catch (e) {
    console.error('[telegram-webhook]', e)
  }

  return res.sendStatus(200)
}
