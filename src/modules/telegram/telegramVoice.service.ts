import OpenAI from 'openai'
import { getTelegramFileUrlUsingBotToken } from './telegramBot.service'

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) return null
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: key })
  }
  return openaiClient
}

function guessAudioMimeFromUrl(url: string): string {
  const lower = url.toLowerCase()
  if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'audio/ogg'
  if (lower.endsWith('.mp3')) return 'audio/mpeg'
  if (lower.endsWith('.m4a')) return 'audio/mp4'
  if (lower.endsWith('.wav')) return 'audio/wav'
  return 'audio/ogg'
}

function normalizeTranscript(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .trim()
}

function looksLikeHallucination(text: string): boolean {
  const t = text.toLowerCase()
  const blockedPhrases = [
    'đăng ký kênh',
    'like và subscribe',
    'cảm ơn các bạn đã xem',
    'hãy ủng hộ kênh',
    'youtube channel'
  ]
  if (blockedPhrases.some((p) => t.includes(p))) return true
  // Quá ngắn hoặc lặp 1 từ nhiều lần thường là nhận diện lỗi.
  if (t.length < 8) return true
  const words = t.split(' ').filter(Boolean)
  if (words.length >= 4) {
    const unique = new Set(words)
    if (unique.size <= Math.max(1, Math.floor(words.length / 3))) return true
  }
  return false
}

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
  )
}

function isRewriteTooDifferent(original: string, rewritten: string): boolean {
  const o = wordSet(original)
  const r = wordSet(rewritten)
  if (o.size === 0 || r.size === 0) return true

  let inter = 0
  for (const w of o) {
    if (r.has(w)) inter += 1
  }
  const overlap = inter / Math.max(o.size, r.size)

  const lenRatio = rewritten.length / Math.max(1, original.length)
  const lengthTooDifferent = lenRatio < 0.75 || lenRatio > 1.3
  return overlap < 0.7 || lengthTooDifferent
}

async function rewriteTranscriptForDiary(
  client: OpenAI,
  transcript: string,
  options?: { eventTypeLabel?: string }
): Promise<string> {
  const eventHint = options?.eventTypeLabel?.trim()
  const systemPrompt =
    'Bạn là trợ lý chuẩn hoá nhật ký canh tác. ' +
    'Nhiệm vụ: sửa rất nhẹ chính tả, dấu câu, ngữ pháp cho dễ đọc. ' +
    'QUY TẮC BẮT BUỘC: không thêm dữ kiện mới, không đổi số liệu, không đổi địa danh, không suy diễn đơn vị đo, không viết dài hơn cần thiết. ' +
    'Nếu câu đã ổn thì GIỮ NGUYÊN văn bản. Không được diễn giải lại. Trả về DUY NHẤT một câu tiếng Việt đã chuẩn hoá.'

  const userPrompt =
    `Ngữ cảnh công việc: ${eventHint || 'Nhật ký canh tác'}.\n` +
    `Văn bản nhận diện thô:\n${transcript}\n\n` +
    'Hãy trả về phiên bản đã chuẩn hoá theo đúng quy tắc.'

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })
  return normalizeTranscript(res.choices[0]?.message?.content ?? transcript)
}

export async function transcribeTelegramVoiceToText(
  voiceFileId: string,
  options?: { eventTypeLabel?: string }
): Promise<string | null> {
  const client = getOpenAI()
  if (!client) return null

  const fileUrl = await getTelegramFileUrlUsingBotToken(voiceFileId)
  if (!fileUrl) return null

  const resp = await fetch(fileUrl)
  if (!resp.ok) return null

  const mime = guessAudioMimeFromUrl(fileUrl)
  const bytes = await resp.arrayBuffer()
  const file = new File([bytes], 'telegram-voice.ogg', { type: mime })

  const result = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'vi',
    temperature: 0,
    prompt:
      `Đây là ghi chú nhật ký canh tác của nông dân Việt Nam${
        options?.eventTypeLabel ? ` cho công việc "${options.eventTypeLabel}"` : ''
      }. Chỉ trả lại đúng nội dung nghe được, không tự thêm lời chào, quảng cáo, hoặc câu kết video.`
  })

  const rawText = normalizeTranscript(result.text ?? '')
  if (!rawText || looksLikeHallucination(rawText)) return null

  const refined = await rewriteTranscriptForDiary(client, rawText, options).catch(() => rawText)
  if (!refined || looksLikeHallucination(refined)) return null

  // Ưu tiên trung thành nội dung voice: nếu bản rewrite lệch nhiều thì dùng bản gốc.
  if (isRewriteTooDifferent(rawText, refined)) {
    return rawText
  }
  return refined
}
