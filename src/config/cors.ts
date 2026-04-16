import cors from 'cors'

/** Origins allowed for Socket.IO (align with HTTP CORS). */
export const getSocketIoAllowedOrigins = (): string[] => [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:8000',
  'http://178.128.98.214:8001',
  'http://178.128.98.214:8000',
  'https://chuoi-xanh-viet-fe.netlify.app'
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
