export interface SearchResult {
  title: string
  snippet: string
  url: string
}

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()

const decodeDdgUrl = (href: string): string => {
  try {
    const uddg = href.match(/uddg=([^&]+)/)?.[1]
    if (uddg) return decodeURIComponent(uddg)
  } catch {
    // ignore
  }
  return href.startsWith('//') ? 'https:' + href : href
}

/**
 * Scrape DuckDuckGo HTML search results — miễn phí, không cần API key.
 * Dùng native fetch (Node 20+).
 */
export const searchDuckDuckGo = async (query: string, limit = 5): Promise<SearchResult[]> => {
  const url = new URL('https://html.duckduckgo.com/html/')
  url.searchParams.set('q', query)
  url.searchParams.set('kl', 'vn-vi')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
    },
    signal: AbortSignal.timeout(10000)
  })

  const str = await res.text()

  const results: SearchResult[] = []
  const linkRegex = /class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

  const links: { url: string; title: string }[] = []
  const snippets: string[] = []

  let m
  while ((m = linkRegex.exec(str)) !== null) {
    links.push({ url: decodeDdgUrl(m[1]), title: stripTags(m[2]) })
  }
  while ((m = snippetRegex.exec(str)) !== null) {
    snippets.push(stripTags(m[1]))
  }

  for (let i = 0; i < Math.min(links.length, limit); i++) {
    results.push({
      url: links[i].url,
      title: links[i].title,
      snippet: snippets[i] || ''
    })
  }

  return results
}

/**
 * Tìm kiếm giá nông sản theo tên cây trồng và vùng.
 */
export const searchCropPrice = async (crop: string, region?: string): Promise<SearchResult[]> => {
  const today = new Date()
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
  const query = region
    ? `giá ${crop} hôm nay ${region} ${dateStr}`
    : `giá ${crop} hôm nay ${dateStr}`

  return searchDuckDuckGo(query, 5)
}

/**
 * Tìm kiếm theo câu hỏi thực tế của người dùng (ưu tiên nội dung chat).
 */
export const searchMarketFromUserMessage = async (userMessage: string, region?: string): Promise<SearchResult[]> => {
  const trimmed = userMessage.trim()
  if (!trimmed) return []

  const today = new Date()
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`
  const query = region?.trim()
    ? `${trimmed} giá nông sản ${region.trim()} ${dateStr} Việt Nam`
    : `${trimmed} giá nông sản ${dateStr} Việt Nam`

  return searchDuckDuckGo(query, 5)
}
