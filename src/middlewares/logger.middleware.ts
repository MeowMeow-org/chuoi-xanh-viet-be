import { Request, Response, NextFunction } from 'express'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
}

/**
 * Get color for HTTP method
 */
function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return colors.cyan
    case 'POST':
      return colors.green
    case 'PUT':
      return colors.yellow
    case 'PATCH':
      return colors.magenta
    case 'DELETE':
      return colors.red
    default:
      return colors.white
  }
}

/**
 * Get color for HTTP status code
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return colors.green
  } else if (statusCode >= 300 && statusCode < 400) {
    return colors.cyan
  } else if (statusCode >= 400 && statusCode < 500) {
    return colors.yellow
  } else if (statusCode >= 500) {
    return colors.red
  }
  return colors.white
}

/**
 * Get color for duration
 */
function getDurationColor(duration: number): string {
  if (duration < 100) {
    return colors.green
  } else if (duration < 500) {
    return colors.yellow
  } else {
    return colors.red
  }
}

/**
 * Middleware to log all API requests
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  const methodColor = getMethodColor(req.method)

  // Log request
  console.log(
    `${colors.dim}[${timestamp}]${colors.reset} ${methodColor}${colors.bright}${req.method}${colors.reset} ${colors.white}${req.originalUrl}${colors.reset}`
  )
  console.log(`${colors.dim}  IP:${colors.reset} ${req.ip || req.socket.remoteAddress}`)

  // Log query params if exists
  if (Object.keys(req.query).length > 0) {
    console.log(`${colors.dim}  Query:${colors.reset}`, req.query)
  }

  // Log body if exists (excluding password and sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = sanitizeBody(req.body)
    console.log(`${colors.dim}  Body:${colors.reset}`, JSON.stringify(sanitizedBody, null, 2))
  }

  // Log important headers
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization
    const tokenPreview = authHeader.substring(0, 20) + '...'
    console.log(`${colors.dim}  Authorization:${colors.reset} ${colors.cyan}${tokenPreview}${colors.reset}`)
  }

  // Capture response
  const originalSend = res.send
  res.send = function (body) {
    const duration = Date.now() - startTime
    const statusCode = res.statusCode
    const statusColor = getStatusColor(statusCode)
    const durationColor = getDurationColor(duration)

    // Log response with colors
    console.log(
      `${colors.dim}[${timestamp}]${colors.reset} ${methodColor}${colors.bright}${req.method}${colors.reset} ${colors.white}${req.originalUrl}${colors.reset} ${colors.dim}-${colors.reset} ${statusColor}${colors.bright}${statusCode}${colors.reset} ${colors.dim}(${durationColor}${duration}ms${colors.reset}${colors.dim})${colors.reset}`
    )

    // Log response body if error or in development mode
    if (statusCode >= 400 || process.env.NODE_ENV === 'development') {
      try {
        const responseBody = typeof body === 'string' ? JSON.parse(body) : body
        if (responseBody && Object.keys(responseBody).length > 0) {
          console.log(`${colors.dim}  Response:${colors.reset}`, JSON.stringify(responseBody, null, 2))
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    return originalSend.call(this, body)
  }

  next()
}

/**
 * Sanitize body to hide sensitive information
 */
function sanitizeBody(body: any): any {
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey']

  if (typeof body !== 'object' || body === null) {
    return body
  }

  if (Array.isArray(body)) {
    return body.map((item) => sanitizeBody(item))
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(body)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***HIDDEN***'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
