import { GoogleGenerativeAI, type Schema } from '@google/generative-ai'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

class GeminiKeyManager {
  private apiKeys: string[]
  private currentIndex = 0
  private failedKeys = new Set<string>()

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys
  }

  get hasKeys(): boolean {
    return this.apiKeys.length > 0
  }

  getCurrentKey(): string | null {
    if (!this.apiKeys.length) return null
    return this.apiKeys[this.currentIndex]
  }

  switchToNextKey(): string | null {
    if (!this.apiKeys.length) return null
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length
    if (this.currentIndex === 0) this.failedKeys.clear()
    return this.apiKeys[this.currentIndex]
  }

  markKeyFailed(key: string) {
    this.failedKeys.add(key)
  }

  allKeysFailed(): boolean {
    return this.failedKeys.size >= this.apiKeys.length
  }
}

class GeminiService {
  private keyManager: GeminiKeyManager
  private modelName: string
  private maxRetries: number
  private temperature: number

  constructor() {
    const keysStr = process.env.GEMINI_API_KEYS ?? ''
    const keys = keysStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    this.keyManager = new GeminiKeyManager(keys)
    this.modelName = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
    this.maxRetries = Number(process.env.GEMINI_MAX_RETRIES) || 5
    this.temperature = Number(process.env.GEMINI_TEMPERATURE) || 0.3

    if (!this.keyManager.hasKeys) {
      console.warn('No Gemini API keys configured. AI features will not work.')
    }
  }

  async generate<T>({
    content,
    systemInstruction,
    responseSchema
  }: {
    content: string
    systemInstruction: string
    responseSchema: Schema
  }): Promise<T | null> {
    if (!this.keyManager.hasKeys) {
      throw new Error('No Gemini API keys configured')
    }

    let lastError: unknown = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const key = this.keyManager.getCurrentKey()
        if (!key) throw new Error('Failed to obtain Gemini API key')

        const client = new GoogleGenerativeAI(key)
        const model = client.getGenerativeModel({
          model: this.modelName,
          systemInstruction,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: this.temperature,
            topP: 0.8,
            topK: 20
          }
        })

        const result = await model.generateContent(content)
        const rawText = result.response.text()
        const text = extractJsonText(rawText)
        return JSON.parse(text) as T
      } catch (e: unknown) {
        const errorStr = String(e)
        lastError = e
        const gErr = e as { status?: number; message?: string; errorDetails?: unknown }
        if (gErr?.status === 400 || errorStr.includes('400')) {
          console.error('Gemini 400 (schema/prompt?):', gErr?.message ?? errorStr, gErr?.errorDetails)
        }

        if (errorStr.includes('429')) {
          const currentKey = this.keyManager.getCurrentKey()
          if (currentKey) this.keyManager.markKeyFailed(currentKey)

          if (this.keyManager.allKeysFailed()) {
            throw new ErrorWithStatus({
              status: HTTP_STATUS.SERVICE_UNAVAILABLE,
              message: 'All API keys have reached rate limit. Please try again later.'
            })
          }

          this.keyManager.switchToNextKey()
          continue
        }

        if (errorStr.includes('400')) break
      }
    }

    console.error(`Gemini generation failed after ${this.maxRetries} attempts:`, lastError)
    return null
  }
}

/** Bỏ markdown fence nếu model trả ```json ... ``` thay vì JSON thuần */
function extractJsonText(raw: string): string {
  let t = raw.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '')
    const end = t.lastIndexOf('```')
    if (end !== -1) t = t.slice(0, end)
    t = t.trim()
  }
  return t
}

const geminiService = new GeminiService()
export default geminiService
