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

export async function transcribeTelegramVoiceToText(voiceFileId: string): Promise<string | null> {
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
      'Đây là ghi chú nhật ký canh tác của nông dân Việt Nam. Chỉ trả lại đúng nội dung nghe được, không tự thêm lời chào, quảng cáo, hoặc câu kết video.'
  })

  const text = normalizeTranscript(result.text ?? '')
  if (!text || looksLikeHallucination(text)) return null
  return text
}
