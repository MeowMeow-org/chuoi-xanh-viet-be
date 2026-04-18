import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import anchorService from '../anchor/anchor.service'

const saleUnitSelect = {
  id: true,
  season_id: true,
  code: true,
  quantity: true,
  unit: true,
  qr_token: true,
  qr_url: true,
  short_code: true,
  status: true,
  created_at: true
} as const

const diarySelect = {
  id: true,
  season_id: true,
  farm_id: true,
  actor_user_id: true,
  event_type: true,
  event_date: true,
  server_timestamp: true,
  description: true,
  extra_data: true,
  created_at: true
} as const

/**
 * Cùng quy tắc cho UI (Neo blockchain) và verify:
 * ưu tiên bản có tx Sepolia, trong cùng nhóm thì mới nhất trước (lịch sử neo sau `amended` nếu có).
 */
export function sortTraceAnchorsReferenceFirst<
  T extends { tx_hash: string | null; created_at: Date }
>(anchors: T[]): T[] {
  return [...anchors].sort((a, b) => {
    const aOn = a.tx_hash != null && String(a.tx_hash).length > 0 ? 1 : 0
    const bOn = b.tx_hash != null && String(b.tx_hash).length > 0 ? 1 : 0
    if (aOn !== bOn) return bOn - aOn
    return b.created_at.getTime() - a.created_at.getTime()
  })
}

class TraceService {
  /**
   * Resolve 1 "code" (short_code hoặc qr_token) thành sale_unit + season.
   * Đồng thời log 1 bản ghi trace_scans.
   */
  resolveByCode = async ({ code, meta }: { code: string; meta?: { ip?: string | null; userAgent?: string | null } }) => {
    const trimmed = code.trim()
    if (trimmed.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.TRACE_CODE_REQUIRED
      })
    }

    const saleUnit = await prisma.sale_units.findFirst({
      where: {
        OR: [{ short_code: trimmed }, { qr_token: trimmed }, { code: trimmed }]
      },
      select: saleUnitSelect
    })

    if (saleUnit == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.TRACE_CODE_NOT_FOUND
      })
    }

    // Fire-and-forget: log trace scan. Lỗi log không ảnh hưởng phản hồi.
    prisma.trace_scans
      .create({
        data: {
          sale_unit_id: saleUnit.id,
          ip_address: meta?.ip ?? null,
          user_agent: meta?.userAgent ?? null,
          result: saleUnit.status === 'active' ? 'ok' : 'disabled',
          abnormal_flag: saleUnit.status !== 'active'
        }
      })
      .catch(() => undefined)

    return saleUnit
  }

  /**
   * Lấy full trace của 1 season: farm, farmer, cooperative link, diary entries (cả inspection),
   * attachments, anchor mới nhất.
   */
  getSeasonTrace = async ({ seasonId }: { seasonId: string }) => {
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      include: {
        farms: {
          select: {
            id: true,
            name: true,
            area_ha: true,
            crop_main: true,
            province: true,
            district: true,
            ward: true,
            address: true,
            latitude: true,
            longitude: true,
            in_cooperative: true,
            users: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
                avatar_url: true
              }
            },
            cooperative_members: {
              where: { status: 'approved' },
              orderBy: { verified_at: 'desc' },
              take: 1,
              select: {
                cooperative_user: {
                  select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_url: true
                  }
                },
                verified_at: true
              }
            }
          }
        },
        season_anchors: {
          orderBy: { created_at: 'desc' }
        },
        sale_units: {
          orderBy: { created_at: 'desc' },
          select: saleUnitSelect
        },
        diary_entries: {
          orderBy: [{ event_date: 'asc' }, { server_timestamp: 'asc' }],
          select: {
            ...diarySelect,
            diary_attachments: {
              orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
              select: {
                id: true,
                file_url: true,
                mime_type: true,
                sort_order: true,
                meta: true
              }
            },
            users: {
              select: {
                id: true,
                full_name: true,
                role: true
              }
            }
          }
        }
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    const anchorsSorted = sortTraceAnchorsReferenceFirst(season.season_anchors).slice(0, 5)

    return {
      season: {
        ...season,
        season_anchors: anchorsSorted
      }
    }
  }

  /**
   * Verify hash: so sánh canonical hash tính lại từ DB với **cùng** bản anchor tham chiếu như UI truy xuất
   * (ưu tiên có tx_hash / neo chain, không dùng `is_final` vì dễ lệch với `anchors[0]`).
   */
  verifySeason = async ({ seasonId }: { seasonId: string }) => {
    const anchorRows = await prisma.season_anchors.findMany({
      where: { season_id: seasonId }
    })
    const reference = sortTraceAnchorsReferenceFirst(anchorRows)[0] ?? null

    const canonical = await anchorService.buildCanonicalForVerify(
      seasonId,
      reference
        ? {
            anchor_meta: reference.anchor_meta,
            checkpoint_type: reference.checkpoint_type
          }
        : null
    )

    return {
      currentHash: canonical.payloadHash,
      onChainHash: reference?.data_hash ?? null,
      match: reference ? canonical.payloadHash === reference.data_hash : null,
      anchor: reference
    }
  }
}

const traceService = new TraceService()
export default traceService
