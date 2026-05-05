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
