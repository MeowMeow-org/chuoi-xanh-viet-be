export interface RssArticle {
  title: string
  url: string
  description: string
  publishedAt: Date
  source: string
}

export interface Evidence {
  title: string
  url: string
  source: string
  publishedAt: string
}

export interface HotCrop {
  name: string
  trendScore: number
  sentiment: 'positive' | 'negative' | 'neutral'
  reason: string
  evidence: Evidence[]
}

export interface MarketSignals {
  supplyPressure: string
  demandSignals: string
  priceAlerts: string[]
  evidence: Evidence[]
}

export interface TechSpotlight {
  title: string
  summary: string
  impact: string
  evidence: Evidence[]
}

export interface TrendAlert {
  type: 'disease' | 'weather' | 'price' | 'policy'
  severity: 'high' | 'medium' | 'low'
  message: string
  evidence: Evidence[]
}

export interface AgriTrendResponse {
  generatedAt: string
  cacheExpiresAt: string
  summary: string
  totalArticlesAnalyzed: number
  hotCrops: HotCrop[]
  marketSignals: MarketSignals
  techSpotlight: TechSpotlight[]
  alerts: TrendAlert[]
}

// Internal shapes returned by AI
export interface AiCropItem {
  name: string
  trendScore: number
  sentiment: 'positive' | 'negative' | 'neutral'
  reason: string
  evidenceIndexes: number[]
}

export interface AiMarketSignals {
  supplyPressure: string
  demandSignals: string
  priceAlerts: string[]
  evidenceIndexes: number[]
}

export interface AiTechItem {
  title: string
  summary: string
  impact: string
  evidenceIndexes: number[]
}

export interface AiAlertItem {
  type: 'disease' | 'weather' | 'price' | 'policy'
  severity: 'high' | 'medium' | 'low'
  message: string
  evidenceIndexes: number[]
}

export interface AiAnalysisResult {
  hotCrops: AiCropItem[]
  marketSignals: AiMarketSignals
  techSpotlight: AiTechItem[]
  alerts: AiAlertItem[]
  summary: string
}
