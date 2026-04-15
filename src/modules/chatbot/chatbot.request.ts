export interface ChatRequestBody {
  message: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

export interface MarketQueryRequestBody {
  crop: string
  region?: string
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
}

export interface DiagnoseRequestBody {
  note?: string
}
