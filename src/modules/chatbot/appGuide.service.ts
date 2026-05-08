import OpenAI from 'openai'
import { APP_GUIDE_SECTIONS, type GuideSection } from './docs/app-guide'

let _openai: OpenAI | null = null
const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

const APP_GUIDE_SYSTEM_PROMPT = (context: string) => `Bạn là trợ lý hỗ trợ người dùng của nền tảng Chuỗi Xanh Việt.

GIỚI HẠN PHẠM VI:
- Bạn CHỈ trả lời các câu hỏi liên quan đến cách sử dụng ứng dụng Chuỗi Xanh Việt hoặc các chủ đề nông nghiệp, nông sản.
- Nếu câu hỏi KHÔNG liên quan, hãy từ chối lịch sự và giải thích rằng bạn chỉ hỗ trợ hướng dẫn sử dụng ứng dụng và các vấn đề nông nghiệp.

Dưới đây là tài liệu hướng dẫn sử dụng chính thức của ứng dụng:

--- TÀI LIỆU HƯỚNG DẪN ---
${context}
--- KẾT THÚC TÀI LIỆU ---

Khi trả lời:
- Dựa HOÀN TOÀN vào tài liệu hướng dẫn trên
- Trả lời theo từng bước rõ ràng, có đánh số
- Dùng ngôn ngữ đơn giản, thân thiện
- Nếu câu hỏi liên quan nhiều tính năng, hướng dẫn từng tính năng riêng
- Nếu không tìm thấy thông tin trong tài liệu, nói rõ "Tính năng này chưa có trong tài liệu hướng dẫn hiện tại"
- Luôn trả lời bằng tiếng Việt`

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\w\sÀ-ɏḀ-ỿ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function scoreSection(section: GuideSection, queryTokens: string[]): number {
  const keywordTokens = section.keywords.map((k) => k.toLowerCase())
  const titleTokens = tokenize(section.title)
  const contentSample = tokenize(section.content.slice(0, 300))

  let score = 0
  for (const qt of queryTokens) {
    for (const kw of keywordTokens) {
      if (kw.includes(qt) || qt.includes(kw)) score += 3
    }
    for (const tt of titleTokens) {
      if (tt.includes(qt) || qt.includes(tt)) score += 2
    }
    for (const ct of contentSample) {
      if (ct === qt) score += 1
    }
  }
  return score
}

function retrieveSections(query: string, topK = 4): GuideSection[] {
  const queryTokens = tokenize(query)
  const scored = APP_GUIDE_SECTIONS.map((section) => ({
    section,
    score: scoreSection(section, queryTokens)
  }))
  scored.sort((a, b) => b.score - a.score)

  const relevant = scored.filter((s) => s.score > 0).slice(0, topK)

  // Nếu không match được gì thì lấy tất cả (fallback)
  if (relevant.length === 0) {
    return APP_GUIDE_SECTIONS
  }

  return relevant.map((s) => s.section)
}

export const queryAppGuide = async (
  message: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []
) => {
  const sections = retrieveSections(message)
  const context = sections.map((s) => `### ${s.title}\n${s.content}`).join('\n\n---\n\n')

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: APP_GUIDE_SYSTEM_PROMPT(context) },
    ...conversationHistory,
    { role: 'user', content: message }
  ]

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1500,
    temperature: 0.3
  })

  return {
    reply: response.choices[0].message.content,
    matchedSections: sections.map((s) => s.title),
    usage: {
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens
    }
  }
}
