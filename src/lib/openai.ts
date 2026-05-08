import OpenAI from 'openai'

class OpenAIService {
  private client: OpenAI
  private modelName: string
  private temperature: number

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY ?? ''
    this.client = new OpenAI({ apiKey })
    this.modelName = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    this.temperature = Number(process.env.OPENAI_TEMPERATURE) || 0.3

    if (!apiKey) {
      console.warn('No OpenAI API key configured. AI features will not work.')
    }
  }

  async generate<T>({
    content,
    systemInstruction,
    jsonSchema
  }: {
    content: string
    systemInstruction: string
    jsonSchema: Record<string, unknown>
  }): Promise<T | null> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        temperature: this.temperature,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            strict: true,
            schema: jsonSchema
          }
        }
      })

      const text = response.choices[0]?.message?.content ?? ''
      return JSON.parse(text) as T
    } catch (e) {
      console.error('OpenAI generation failed:', e)
      return null
    }
  }
}

const openAIService = new OpenAIService()
export default openAIService
