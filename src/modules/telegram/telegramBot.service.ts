/**
 * Telegram Bot API — gửi tin nhắn text vào một chat đã có tương tác (/start).
 * @see https://core.telegram.org/bots/api
 */

function envFlag(name: string): boolean {
  const v = process.env[name]
  return v === '1' || v?.toLowerCase() === 'true' || v?.toLowerCase() === 'yes'
}

export function isTelegramOutboundConfigured(): boolean {
  return envFlag('TELEGRAM_NOTIFICATIONS_ENABLED') && Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim())
}

const MAX_TEXT = 3900
type InlineButton = { text: string; callback_data: string }
type InlineKeyboard = InlineButton[][]

export async function sendTelegramText(chatId: string, text: string): Promise<void> {
  if (!isTelegramOutboundConfigured()) return

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return

  const safeText = text.trim().slice(0, MAX_TEXT)
  const chat = chatId.trim()
  if (!chat) return

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text: safeText,
      disable_web_page_preview: true
    })
  })

  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!res.ok || json.ok !== true) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(json)}`)
  }
}

/** Trả lời user trong webhook (chỉ cần BOT token, không phụ thuộc cờ TELEGRAM_NOTIFICATIONS_ENABLED). */
export async function sendTelegramTextUsingBotToken(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return

  const safeText = text.trim().slice(0, MAX_TEXT)
  const chat = chatId.trim()
  if (!chat) return

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text: safeText,
      disable_web_page_preview: true
    })
  })

  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!res.ok || json.ok !== true) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(json)}`)
  }
}

/** Gửi tin nhắn có inline keyboard để user chỉ cần bấm nút. */
export async function sendTelegramInlineKeyboardUsingBotToken(params: {
  chatId: string
  text: string
  inlineKeyboard: InlineKeyboard
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return
  const chat = params.chatId.trim()
  if (!chat) return

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text: params.text.trim().slice(0, MAX_TEXT),
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: params.inlineKeyboard
      }
    })
  })

  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!res.ok || json.ok !== true) {
    throw new Error(`Telegram inline keyboard failed: ${JSON.stringify(json)}`)
  }
}

/** Gửi bàn phím trả lời cố định để user luôn có nút thao tác nhanh. */
export async function sendTelegramPersistentDiaryKeyboardUsingBotToken(chatId: string, text?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return
  const chat = chatId.trim()
  if (!chat) return

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text: (text?.trim() || 'Chọn thao tác nhanh bên dưới.').slice(0, MAX_TEXT),
      disable_web_page_preview: true,
      reply_markup: {
        keyboard: [[{ text: '📝 Ghi nhật ký' }, { text: '🌱 Tạo mùa vụ' }], [{ text: '📋 Menu' }]],
        resize_keyboard: true,
        one_time_keyboard: false,
        is_persistent: true
      }
    })
  })

  const json = (await res.json()) as { ok?: boolean; description?: string }
  if (!res.ok || json.ok !== true) {
    throw new Error(`Telegram persistent keyboard failed: ${JSON.stringify(json)}`)
  }
}

/** Trả ACK callback query để Telegram dừng spinner "Loading...". */
export async function answerTelegramCallbackQueryUsingBotToken(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return
  const id = callbackQueryId.trim()
  if (!id) return

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: id,
      text: text?.trim() || undefined,
      show_alert: false
    })
  }).catch(() => {})
}

/** Edit lại message cũ để chat gọn hơn sau khi user bấm nút. */
export async function editTelegramMessageTextUsingBotToken(params: {
  chatId: string
  messageId: number
  text: string
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return
  const chat = params.chatId.trim()
  if (!chat || !Number.isFinite(params.messageId)) return

  const url = `https://api.telegram.org/bot${token}/editMessageText`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      message_id: params.messageId,
      text: params.text.trim().slice(0, MAX_TEXT),
      disable_web_page_preview: true
    })
  }).catch(() => {})
}

/** Lấy URL tải file Telegram bằng file_id (dùng cho ảnh gửi qua bot). */
export async function getTelegramFileUrlUsingBotToken(fileId: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return null
  const id = fileId.trim()
  if (!id) return null

  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(id)}`
  const res = await fetch(url)
  const json = (await res.json()) as { ok?: boolean; result?: { file_path?: string } }
  if (!res.ok || json.ok !== true || !json.result?.file_path) {
    return null
  }
  return `https://api.telegram.org/file/bot${token}/${json.result.file_path}`
}
