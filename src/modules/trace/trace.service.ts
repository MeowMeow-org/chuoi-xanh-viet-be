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
          orderBy: { created_at: 'desc' },
          take: 5
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

    return { season }
  }

  /**
   * Verify hash: so sánh canonical hash tính lại từ DB hiện tại với hash đã lưu trong anchor mới nhất.
   * Trả về `match: true` nếu khớp — chứng tỏ dữ liệu chưa bị sửa đổi sau khi anchor.
   */
  verifySeason = async ({ seasonId }: { seasonId: string }) => {
    const latestAnchor = await prisma.season_anchors.findFirst({
      where: { season_id: seasonId, is_final: true },
      orderBy: { created_at: 'desc' }
    })

    const canonical = await anchorService.buildCanonicalPayloadPublic(seasonId)

    return {
      currentHash: canonical.payloadHash,
      onChainHash: latestAnchor?.data_hash ?? null,
      match: latestAnchor ? canonical.payloadHash === latestAnchor.data_hash : null,
      anchor: latestAnchor
    }
  }
}

const traceService = new TraceService()
export default traceService
