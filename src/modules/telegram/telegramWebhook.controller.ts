import { Request, Response } from 'express'
import {
  answerTelegramCallbackQueryUsingBotToken,
  sendTelegramInlineKeyboardUsingBotToken,
  sendTelegramPersistentDiaryKeyboardUsingBotToken,
  sendTelegramTextUsingBotToken
} from './telegramBot.service'
import { redeemTelegramStartPayload } from './telegramLink.service'
import { telegramDiaryWizardService } from './telegramDiaryWizard.service'

function webhookSecretOk(req: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (!secret) return true
  return req.get('x-telegram-bot-api-secret-token') === secret
}

function parseIncomingMessage(body: unknown): {
  chatId: string
  text?: string
  photoFileId?: string
  voiceFileId?: string
  voiceDurationSec?: number
} | null {
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
  let voiceFileId: string | undefined
  let voiceDurationSec: number | undefined
  if (Array.isArray(m.photo) && m.photo.length > 0) {
    const last = m.photo[m.photo.length - 1]
    if (last && typeof last === 'object' && 'file_id' in last) {
      const fid = (last as Record<string, unknown>).file_id
      if (typeof fid === 'string' && fid.trim() !== '') {
        photoFileId = fid.trim()
      }
    }
  }
  const voice = m.voice
  if (voice && typeof voice === 'object' && 'file_id' in voice) {
    const v = voice as Record<string, unknown>
    const fid = v.file_id
    if (typeof fid === 'string' && fid.trim() !== '') {
      voiceFileId = fid.trim()
    }
    const durationRaw = v.duration
    if (typeof durationRaw === 'number' && Number.isFinite(durationRaw) && durationRaw > 0) {
      voiceDurationSec = Math.floor(durationRaw)
    }
  }
  return { chatId: String(chatId), text, photoFileId, voiceFileId, voiceDurationSec }
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

function isBotActionIntent(text?: string, callbackData?: string): boolean {
  const t = text?.trim().toLowerCase() ?? ''
  if (callbackData === 'wiz_start' || callbackData === 'wiz_new_season_start') return true
  return (
    t === 'nhatky' ||
    t === 'nhật ký' ||
    t === '/nhatky' ||
    t === '/diary' ||
    t === 'taomuavu' ||
    t === 'tạo mùa vụ' ||
    t === '/taomuavu' ||
    t === '/newseason' ||
    t === '/menu' ||
    t === 'menu' ||
    t === '📝 ghi nhật ký' ||
    t === '🌱 tạo mùa vụ' ||
    t === '📋 menu'
  )
}

async function sendMainMenu(chatId: string): Promise<void> {
  await sendTelegramPersistentDiaryKeyboardUsingBotToken(chatId).catch(() => {})
  await sendTelegramInlineKeyboardUsingBotToken({
    chatId,
    text: 'Menu nhanh:\n- 📝 Ghi nhật ký canh tác\n- 🌱 Tạo mùa vụ mới',
    inlineKeyboard: [
      [{ text: '📝 Ghi nhật ký', callback_data: 'wiz_start' }],
      [{ text: '🌱 Tạo mùa vụ', callback_data: 'wiz_new_season_start' }]
    ]
  }).catch(() => {})
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
      const handled = await telegramDiaryWizardService.handleIncoming({
        chatId: cb.chatId,
        callbackData: cb.callbackData,
        callbackMessageId: cb.messageId
      })
      if (!handled && isBotActionIntent(undefined, cb.callbackData)) {
        await sendTelegramTextUsingBotToken(
          cb.chatId,
          'Bạn chưa liên kết đúng tài khoản nông dân hoặc liên kết đã mất hiệu lực. Vào app Chuỗi Xanh → Hồ sơ → «Mở Telegram nhận thông báo», sau đó bấm Start từ link mới.'
        ).catch(() => {})
      }
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
          await sendMainMenu(parsed.chatId)
        } else {
          const result = await redeemTelegramStartPayload(startPayload, parsed.chatId)
          if (result.ok) {
            await sendTelegramTextUsingBotToken(
              parsed.chatId,
              'Đã liên kết Chuỗi Xanh Việt. Bạn sẽ nhận thông báo đơn hàng và tin nhắn ở đây.'
            ).catch(() => {})
            await sendMainMenu(parsed.chatId)
          } else if (result.reason === 'unknown_token' || result.reason === 'expired') {
            await sendTelegramTextUsingBotToken(
              parsed.chatId,
              'Liên kết hết hạn hoặc không đúng. Mở lại app Chuỗi Xanh → Hồ sơ → «Mở Telegram nhận thông báo» để lấy link mới (hiệu lực khoảng 15 phút).'
            ).catch(() => {})
          }
        }
      } else {
        const handled = await telegramDiaryWizardService.handleIncoming({
          chatId: parsed.chatId,
          text: parsed.text,
          photoFileId: parsed.photoFileId,
          voiceFileId: parsed.voiceFileId,
          voiceDurationSec: parsed.voiceDurationSec
        })
        if (!handled && isBotActionIntent(parsed.text)) {
          await sendTelegramTextUsingBotToken(
            parsed.chatId,
            'Bạn chưa liên kết đúng tài khoản nông dân hoặc liên kết đã mất hiệu lực. Vào app Chuỗi Xanh → Hồ sơ → «Mở Telegram nhận thông báo», sau đó bấm Start từ link mới.'
          ).catch(() => {})
        }
      }
    }
  } catch (e) {
    console.error('[telegram-webhook]', e)
  }

  return res.sendStatus(200)
}
