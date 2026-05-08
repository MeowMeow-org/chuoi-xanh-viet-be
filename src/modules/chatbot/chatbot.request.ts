export interface ChatRequestBody {
  message: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

export interface MarketQueryRequestBody {
  /** Nội dung chat / câu hỏi — ưu tiên cho tìm kiếm và phản hồi AI */
  message?: string
  /** Ô gợi ý nông sản (tuỳ chọn); chỉ là ngữ cảnh thêm nếu khác với message */
  crop?: string
  region?: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

export interface DiagnoseRequestBody {
  note?: string
}
