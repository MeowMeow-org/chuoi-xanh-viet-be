import type { Prisma, user_role } from '@prisma/client'
import type { Request } from 'express'
import prisma from '~/lib/prisma'

type AuditSource = 'api' | 'worker' | 'script'
type AuditStatus = 'success' | 'failed'

const SENSITIVE_KEY_RE = /(password|token|secret|authorization|cookie|credit|cvv)/i

export type AuditWriteInput = {
  actorUserId?: string | null
  actorRole?: user_role | null
  source?: AuditSource
  module: string
  action: string
  entityType?: string | null
  entityId?: string | null
  status: AuditStatus
  beforeData?: unknown
  afterData?: unknown
  diffData?: unknown
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  path?: string | null
  method?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}

export type AuditLogFilters = {
  page?: number
  limit?: number
  from?: Date
  to?: Date
  module?: string
  action?: string
  status?: AuditStatus
  actorUserId?: string
  entityType?: string
  entityId?: string
  q?: string
}

function sanitizeValue(input: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated-depth]'
  if (input == null) return input
  if (typeof input === 'string') {
    return input.length > 3000 ? `${input.slice(0, 3000)}...[truncated]` : input
  }
  if (typeof input !== 'object') return input
  if (Array.isArray(input)) {
    if (input.length > 50) {
      return input.slice(0, 50).map((x) => sanitizeValue(x, depth + 1))
    }
    return input.map((x) => sanitizeValue(x, depth + 1))
  }

  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = '[redacted]'
      continue
    }
    out[k] = sanitizeValue(v, depth + 1)
  }
  return out
}

function trimMessage(message: string | null | undefined): string | null {
  if (!message) return null
  const t = message.trim()
  if (!t) return null
  return t.length > 2000 ? `${t.slice(0, 2000)}...[truncated]` : t
}

class AuditService {
  sanitize(input: unknown): Prisma.InputJsonValue | undefined {
    if (input == null) return undefined
    return sanitizeValue(input) as Prisma.InputJsonValue
  }

  write = async (input: AuditWriteInput) => {
    await prisma.audit_logs.create({
      data: {
        actor_user_id: input.actorUserId ?? null,
        actor_role: input.actorRole ?? null,
        source: input.source ?? 'api',
        module: input.module,
        action: input.action,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        status: input.status,
        before_data: this.sanitize(input.beforeData),
        after_data: this.sanitize(input.afterData),
        diff_data: this.sanitize(input.diffData),
        request_id: input.requestId ?? null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        path: input.path ?? null,
        method: input.method?.toUpperCase() ?? null,
        error_code: input.errorCode ?? null,
        error_message: trimMessage(input.errorMessage)
      }
    })
  }

  writeFromRequest = async (
    req: Request,
    input: Omit<AuditWriteInput, 'requestId' | 'ipAddress' | 'userAgent' | 'path' | 'method' | 'actorUserId' | 'actorRole' | 'source'> &
      Partial<Pick<AuditWriteInput, 'actorUserId' | 'actorRole' | 'source'>>
  ) => {
    const actorIdFromToken = req.decoded_authorization?.user_id
    const actorRoleFromToken = req.current_user?.role ?? req.decoded_authorization?.role
    await this.write({
      ...input,
      actorUserId: input.actorUserId ?? actorIdFromToken ?? null,
      actorRole: (input.actorRole ?? actorRoleFromToken ?? null) as user_role | null,
      source: input.source ?? req.audit_context?.source ?? 'api',
      requestId: req.audit_context?.request_id ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      path: req.originalUrl ?? req.path,
      method: req.method
    })
  }

  writeBestEffort = (input: AuditWriteInput) => {
    void this.write(input).catch((err) => {
      console.error('[audit-log:write-failed]', err)
    })
  }

  listLogs = async (filters: AuditLogFilters) => {
    const safePage = Math.max(1, filters.page ?? 1)
    const safeLimit = Math.min(100, Math.max(1, filters.limit ?? 20))
    const skip = (safePage - 1) * safeLimit
    const q = filters.q?.trim()

    const where: Prisma.audit_logsWhereInput = {
      ...(filters.from || filters.to
        ? {
            created_at: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {})
            }
          }
        : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.actorUserId ? { actor_user_id: filters.actorUserId } : {}),
      ...(filters.entityType ? { entity_type: filters.entityType } : {}),
      ...(filters.entityId ? { entity_id: filters.entityId } : {}),
      ...(q
        ? {
            OR: [
              { module: { contains: q, mode: 'insensitive' } },
              { action: { contains: q, mode: 'insensitive' } },
              { entity_type: { contains: q, mode: 'insensitive' } },
              { path: { contains: q, mode: 'insensitive' } },
              { error_message: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [items, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
              role: true
            }
          }
        }
      }),
      prisma.audit_logs.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)

    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }
}

const auditService = new AuditService()
export default auditService
