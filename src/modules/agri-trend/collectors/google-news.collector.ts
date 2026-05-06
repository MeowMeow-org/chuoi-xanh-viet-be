import axios from 'axios'
import { load } from 'cheerio'
import type { RssArticle } from '../agri-trend.types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Each keyword targets a different angle of agri news
const SEARCH_KEYWORDS = [
  'cây trồng xu hướng Việt Nam 2025',
  'nông nghiệp công nghệ cao Việt Nam',
  'xuất khẩu nông sản Việt Nam',
  'dịch bệnh cây trồng cảnh báo Việt Nam',
  'giá sầu riêng cà phê hồ tiêu lúa gạo',
  'nông nghiệp hữu cơ thị trường Việt Nam',
  'agritech nông nghiệp thông minh Việt Nam',
]

function decodeGoogleNewsUrl(rawUrl: string): string {
  // Google News RSS wraps real URL — return as-is since it redirects correctly
  return rawUrl.startsWith('http') ? rawUrl : `https:${rawUrl}`
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

async function searchGoogleNews(keyword: string): Promise<RssArticle[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=vi&gl=VN&ceid=VN:vi`

  const res = await axios.get<string>(rssUrl, {
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    responseType: 'text',
  })

  const $ = load(res.data, { xmlMode: true })
  const articles: RssArticle[] = []
  const now = Date.now()

  $('item').each((_i, el) => {
    const title = stripHtml($(el).find('title').text())
    const rawLink = $(el).find('link').text().trim() || $(el).find('guid').text().trim()
    const url = decodeGoogleNewsUrl(rawLink)
    const pubDateStr = $(el).find('pubDate').text().trim()
    const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date()
    const sourceName = $(el).find('source').text().trim() || 'Google News'
    const description = stripHtml($(el).find('description').text()).slice(0, 400)

    if (!title || !url || !url.startsWith('http')) return
    if (now - publishedAt.getTime() > SEVEN_DAYS_MS) return

    articles.push({ title, url, description, publishedAt, source: sourceName })
  })

  return articles
}

export async function collectFromGoogleNews(): Promise<RssArticle[]> {
  const results = await Promise.allSettled(SEARCH_KEYWORDS.map((kw) => searchGoogleNews(kw)))

  const all: RssArticle[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      all.push(...r.value)
    } else {
      console.warn(
        `[AgriTrend] Google News failed for "${SEARCH_KEYWORDS[i]}" —`,
        (r.reason as Error).message,
      )
    }
  })

  const seen = new Set<string>()
  return all.filter((a) => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })
}
