import OpenAI from 'openai'
import type {
  RssArticle,
  AgriTrendResponse,
  AiAnalysisResult,
  Evidence,
  AiCropItem,
  AiTechItem,
  AiAlertItem,
} from './agri-trend.types'
import { collectFromRss } from './collectors/rss.collector'
import { collectFromGoogleNews } from './collectors/google-news.collector'
import { trendCache, CACHE_KEY, CACHE_TTL_MS } from './agri-trend.cache'

const MAX_ARTICLES_FOR_AI = 25

let _openai: OpenAI | null = null
const getOpenAI = () => {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// ─── OpenAI Response Schema ──────────────────────────────────────────────────

const TREND_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    hotCrops: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          trendScore: { type: 'integer' },
          sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          reason: { type: 'string' },
          evidenceIndexes: { type: 'array', items: { type: 'integer' } },
        },
        required: ['name', 'trendScore', 'sentiment', 'reason', 'evidenceIndexes'],
        additionalProperties: false,
      },
    },
    marketSignals: {
      type: 'object',
      properties: {
        supplyPressure: { type: 'string' },
        demandSignals: { type: 'string' },
        priceAlerts: { type: 'array', items: { type: 'string' } },
        evidenceIndexes: { type: 'array', items: { type: 'integer' } },
      },
      required: ['supplyPressure', 'demandSignals', 'priceAlerts', 'evidenceIndexes'],
      additionalProperties: false,
    },
    techSpotlight: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          impact: { type: 'string' },
          evidenceIndexes: { type: 'array', items: { type: 'integer' } },
        },
        required: ['title', 'summary', 'impact', 'evidenceIndexes'],
        additionalProperties: false,
      },
    },
    alerts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['disease', 'weather', 'price', 'policy'] },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          message: { type: 'string' },
          evidenceIndexes: { type: 'array', items: { type: 'integer' } },
        },
        required: ['type', 'severity', 'message', 'evidenceIndexes'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['hotCrops', 'marketSignals', 'techSpotlight', 'alerts', 'summary'],
  additionalProperties: false,
}

function toEvidence(article: RssArticle): Evidence {
  return {
    title: article.title,
    url: article.url,
    source: article.source,
    publishedAt: article.publishedAt.toISOString(),
  }
}

function mapEvidence(indexes: number[], articles: RssArticle[]): Evidence[] {
  if (!Array.isArray(indexes)) return []
  const seen = new Set<string>()
  return indexes
    .filter((i) => typeof i === 'number' && i >= 1 && i <= articles.length)
    .map((i) => toEvidence(articles[i - 1]))
    .filter((e) => {
      if (seen.has(e.url)) return false
      seen.add(e.url)
      return true
    })
}

// ─── Prompt ────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION =
  'Bạn là chuyên gia phân tích thị trường nông nghiệp Việt Nam. Nhiệm vụ: đọc các bài báo được cung cấp, phân tích xu hướng cây trồng, tín hiệu thị trường, công nghệ nông nghiệp và cảnh báo. Chỉ sử dụng thông tin từ các bài báo đã cung cấp. evidenceIndexes phải là số nguyên hợp lệ trong danh sách bài báo.'

function buildPrompt(articles: RssArticle[]): string {
  const today = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

  const context = articles
    .map((a, i) => {
      const dateStr = a.publishedAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      return `[${i + 1}] Nguồn: ${a.source} | Ngày: ${dateStr}\nTiêu đề: ${a.title}\nMô tả: ${a.description}`
    })
    .join('\n\n---\n\n')

  return `Hôm nay là ${today}. Phân tích ${articles.length} bài báo nông nghiệp sau và trả về kết quả phân tích:

${context}

Quy tắc:
- hotCrops: tối đa 5 cây, trendScore từ 0-100, sentiment là "positive"/"negative"/"neutral"
- alerts type: "disease"/"weather"/"price"/"policy", severity: "high"/"medium"/"low"
- evidenceIndexes: chỉ dùng số nguyên từ 1 đến ${articles.length}
- Nếu không có dữ liệu cho techSpotlight hoặc alerts thì để mảng rỗng`
}

// ─── AI Analysis ───────────────────────────────────────────────────────────

async function analyzeWithAi(articles: RssArticle[]): Promise<AiAnalysisResult> {
  let raw: string | null = null
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: buildPrompt(articles) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'agri_trend_result',
          strict: true,
          schema: TREND_JSON_SCHEMA,
        },
      },
      temperature: 0.3,
    })
    raw = completion.choices[0]?.message.content ?? null
  } catch (err) {
    console.error('[AgriTrend] OpenAI call failed:', err)
    throw new Error('OpenAI không phản hồi, vui lòng thử lại sau.')
  }

  if (!raw) throw new Error('OpenAI không trả về kết quả, vui lòng thử lại sau.')

  try {
    return JSON.parse(raw) as AiAnalysisResult
  } catch {
    console.error('[AgriTrend] Failed to parse OpenAI response:', raw)
    throw new Error('Không thể phân tích kết quả từ AI, vui lòng thử lại sau.')
  }
}

// ─── Response Builder ──────────────────────────────────────────────────────

function buildResponse(
  ai: AiAnalysisResult,
  articles: RssArticle[],
  expiresAt: number,
): AgriTrendResponse {
  return {
    generatedAt: new Date().toISOString(),
    cacheExpiresAt: new Date(expiresAt).toISOString(),
    summary: ai.summary ?? '',
    totalArticlesAnalyzed: articles.length,
    hotCrops: (ai.hotCrops ?? []).map((c: AiCropItem) => ({
      name: c.name,
      trendScore: c.trendScore,
      sentiment: c.sentiment,
      reason: c.reason,
      evidence: mapEvidence(c.evidenceIndexes ?? [], articles),
    })),
    marketSignals: {
      supplyPressure: ai.marketSignals?.supplyPressure ?? '',
      demandSignals: ai.marketSignals?.demandSignals ?? '',
      priceAlerts: ai.marketSignals?.priceAlerts ?? [],
      evidence: mapEvidence(ai.marketSignals?.evidenceIndexes ?? [], articles),
    },
    techSpotlight: (ai.techSpotlight ?? []).map((t: AiTechItem) => ({
      title: t.title,
      summary: t.summary,
      impact: t.impact,
      evidence: mapEvidence(t.evidenceIndexes ?? [], articles),
    })),
    alerts: (ai.alerts ?? []).map((a: AiAlertItem) => ({
      type: a.type,
      severity: a.severity,
      message: a.message,
      evidence: mapEvidence(a.evidenceIndexes ?? [], articles),
    })),
  }
}

// ─── Data Collection ───────────────────────────────────────────────────────

async function collectAllArticles(): Promise<RssArticle[]> {
  const [rssResult, googleResult] = await Promise.allSettled([
    collectFromRss(),
    collectFromGoogleNews(),
  ])

  const all: RssArticle[] = []
  if (rssResult.status === 'fulfilled') all.push(...rssResult.value)
  else console.warn('[AgriTrend] RSS collector error:', (rssResult.reason as Error).message)

  if (googleResult.status === 'fulfilled') all.push(...googleResult.value)
  else console.warn('[AgriTrend] Google News error:', (googleResult.reason as Error).message)

  // Global dedup by URL
  const seen = new Set<string>()
  const unique = all.filter((a) => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })

  // Sort by newest first, limit for AI token budget
  return unique
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_ARTICLES_FOR_AI)
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function getAgriTrend(forceRefresh = false): Promise<AgriTrendResponse> {
  if (!forceRefresh) {
    const cached = trendCache.get<AgriTrendResponse>(CACHE_KEY)
    if (cached) {
      console.log('[AgriTrend] Cache hit')
      return cached
    }
  }

  console.log('[AgriTrend] Collecting fresh articles...')
  const articles = await collectAllArticles()
  console.log(`[AgriTrend] Collected ${articles.length} articles`)

  if (articles.length === 0) {
    throw new Error('Không thu thập được bài báo nào. Vui lòng thử lại sau.')
  }

  console.log('[AgriTrend] Running AI analysis...')
  const aiResult = await analyzeWithAi(articles)

  const expiresAt = Date.now() + CACHE_TTL_MS
  const response = buildResponse(aiResult, articles, expiresAt)

  trendCache.set(CACHE_KEY, response, CACHE_TTL_MS)
  console.log(`[AgriTrend] Done. Cached until ${new Date(expiresAt).toLocaleTimeString('vi-VN')}`)

  return response
}

export default { getAgriTrend }
