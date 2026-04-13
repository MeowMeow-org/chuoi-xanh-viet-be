import cors from 'cors'

/**
 * CORS configuration
 * Allows frontend, Swagger UI, and same-origin/no-origin requests
 */
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '').toLowerCase()

const configuredOrigins = [
  process.env.CORS_ORIGIN ?? '',
  process.env.NEXT_PUBLIC_APP_URL ?? '',
  process.env.APP_URL ?? ''
]
  .join(',')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const defaultLocalOrigins = ['http://localhost:3000', 'http://localhost:8000']

const allowedOrigins = new Set([...defaultLocalOrigins, ...configuredOrigins].map(normalizeOrigin))

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin) {
      return callback(null, true)
    }

    // Check if origin is in allowed list
    if (allowedOrigins.has(normalizeOrigin(origin))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})
