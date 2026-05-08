import axios from 'axios'
import { load } from 'cheerio'
import type { RssArticle } from '../agri-trend.types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const RSS_SOURCES = [
  { url: 'https://vnexpress.net/rss/kinh-doanh.rss', name: 'VnExpress' },
  { url: 'https://vnexpress.net/rss/khoa-hoc.rss', name: 'VnExpress Khoa học' },
  { url: 'https://nongnghiep.vn/rss/home.rss', name: 'Báo Nông nghiệp VN' },
  { url: 'https://tuoitre.vn/rss/kinh-te.rss', name: 'Tuổi Trẻ' },
  { url: 'https://dantri.com.vn/rss/kinh-doanh.rss', name: 'Dân Trí' },
  { url: 'https://thanhnien.vn/rss/kinh-te.rss', name: 'Thanh Niên' },
]

const AGRI_KEYWORDS = [
  'nông nghiệp', 'cây trồng', 'nông sản', 'lúa', 'cà phê', 'sầu riêng',
  'hồ tiêu', 'rau', 'trái cây', 'xuất khẩu nông', 'nông dân', 'canh tác',
  'phân bón', 'dịch bệnh', 'giống cây', 'mùa vụ', 'thu hoạch', 'vụ mùa',
  'nông trại', 'cây ăn quả', 'thanh long', 'xoài', 'nhãn', 'vải thiều',
  'chè', 'mía', 'tiêu', 'bưởi', 'cam', 'dứa', 'chuối', 'khoai',
  'ngô', 'đậu nành', 'tôm', 'thủy sản', 'nông nghiệp công nghệ',
  'vietgap', 'globalg', 'organic', 'hữu cơ', 'agritech',
]

function isAgriRelated(title: string, description: string): boolean {
  const text = (title + ' ' + description).toLowerCase()
  return AGRI_KEYWORDS.some((kw) => text.includes(kw))
}

function extractItemLink(itemHtml: string): string {
  // Regex fallback for <link> tag content — more reliable than cheerio in some RSS feeds
  const m = itemHtml.match(/<link>(https?:\/\/[^<]+)<\/link>/i)
  if (m) return m[1].trim()
  const guid = itemHtml.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i)
  if (guid) return guid[1].trim()
  return ''
}

async function collectFromSource(sourceUrl: string, sourceName: string): Promise<RssArticle[]> {
  const res = await axios.get<string>(sourceUrl, {
    timeout: 8000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    },
    responseType: 'text',
  })

  const raw: string = res.data
  const $ = load(raw, { xmlMode: true })
  const articles: RssArticle[] = []
  const now = Date.now()

  $('item').each((_i, el) => {
    const title = $(el).find('title').text().trim()
    const rawDescription = $(el).find('description').text()
    const description = rawDescription
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim()
      .slice(0, 400)

    // Extract link: cheerio xmlMode first, raw regex fallback
    const elHtml = $.xml(el as Parameters<typeof $.xml>[0])
    let url = $(el).find('link').text().trim() || $(el).find('guid').text().trim() || extractItemLink(elHtml)

    const pubDateStr = $(el).find('pubDate').text().trim()
    const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date()

    if (!title || !url) return
    if (!url.startsWith('http')) return
    if (now - publishedAt.getTime() > SEVEN_DAYS_MS) return
    if (!isAgriRelated(title, description)) return

    articles.push({ title, url, description, publishedAt, source: sourceName })
  })

  return articles
}

export async function collectFromRss(): Promise<RssArticle[]> {
  const results = await Promise.allSettled(
    RSS_SOURCES.map((src) => collectFromSource(src.url, src.name)),
  )

  const all: RssArticle[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      all.push(...r.value)
    } else {
      console.warn(`[AgriTrend] RSS failed: ${RSS_SOURCES[i].name} —`, (r.reason as Error).message)
    }
  })

  const seen = new Set<string>()
  return all.filter((a) => {
    if (seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })
}
