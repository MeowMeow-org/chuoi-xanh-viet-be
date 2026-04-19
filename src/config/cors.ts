import cors from 'cors'

/** Tách nhiều origin từ env (dấu phẩy). */
function originsFromCommaList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** FE mặc định: cổng 3000 — dev local + VPS (có thể ghi đè bằng env). */
const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://178.128.98.214:3000'
] as const

/**
 * Origins FE được phép (CORS + Socket.IO).
 * - `FRONTEND_URLS`: nhiều URL, cách nhau bằng dấu phẩy.
 * - `FRONTEND_URL`: một URL (tương thích cũ); gộp thêm nếu chưa có trong danh sách.
 * - Nếu không set gì: mặc định cả localhost:3000 và 178.128.98.214:3000.
 */
export const getFrontendOrigins = (): string[] => {
  const fromList = originsFromCommaList(process.env.FRONTEND_URLS)
  const single = process.env.FRONTEND_URL?.trim()
  const merged: string[] = [...fromList]
  if (single && !merged.includes(single)) merged.push(single)
  if (merged.length === 0) merged.push(...DEFAULT_FRONTEND_ORIGINS)
  return merged
}

/** Origins allowed for Socket.IO (align with HTTP CORS). */
export const getSocketIoAllowedOrigins = (): string[] => [
  ...new Set([
    ...getFrontendOrigins(),
    'http://localhost:8000',
    'http://178.128.98.214:8001',
    'http://178.128.98.214:8000',
    'https://chuoi-xanh-viet-fe.netlify.app'
  ])
]

/**
 * CORS configuration
 * Allows frontend, Swagger UI, and same-origin requests
 */
export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin) {
      return callback(null, true)
    }

    const allowedOrigins = getSocketIoAllowedOrigins()

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === 'development') {
        callback(null, true)
      } else {
        console.error('[CORS] Blocked request origin', {
          origin,
          allowedOrigins
        })
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
