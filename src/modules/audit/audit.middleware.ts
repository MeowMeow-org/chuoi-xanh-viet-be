import { randomUUID } from 'crypto'
import type { NextFunction, Request, Response } from 'express'

export const auditRequestContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const existing = req.get('x-request-id')?.trim()
  req.audit_context = {
    request_id: existing && existing.length > 0 ? existing : randomUUID(),
    source: 'api',
    started_at: new Date().toISOString()
  }
  next()
}
