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
    language: 'vi'
  })

  const text = result.text?.trim()
  return text ? text : null
}
