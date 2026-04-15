import crypto from 'crypto'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'

// Chuẩn hóa JSON đệ quy để payload luôn có cấu trúc ổn định:
// - key của object được sort theo alphabet
// - thứ tự mảng được giữ nguyên (các mảng cần thiết sẽ sort trước khi gọi hàm này)
const normalizeJson = (value: unknown): unknown => {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJson(item))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return entries.reduce<Record<string, unknown>>((acc, [key, nested]) => {
      acc[key] = normalizeJson(nested)
      return acc
    }, {})
  }

  return String(value)
}

const toDateString = (value: Date | null) => {
  if (value == null) return null
  // Field chỉ có ngày sẽ dùng format YYYY-MM-DD để hash ổn định.
  return value.toISOString().slice(0, 10)
}

const toTimestampString = (value: Date | null) => {
  if (value == null) return null
  // Field thời gian đầy đủ dùng ISO để thống nhất timezone/format.
  return value.toISOString()
}

class AnchorService {
  private async getOwnedSeason(userId: string, seasonId: string) {
    // Phân quyền theo dữ liệu: farmer chỉ được build payload cho season mình sở hữu.
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farms: {
          owner_user_id: userId
        }
      },
      include: {
        farms: {
          select: {
            id: true,
            owner_user_id: true,
            name: true,
            area_ha: true,
            crop_main: true,
            province: true,
            district: true,
            ward: true,
            address: true,
            latitude: true,
            longitude: true,
            in_cooperative: true
          }
        },
        diary_entries: {
          include: {
            diary_attachments: true
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

    return season
  }

  buildCanonicalPayload = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    const season = await this.getOwnedSeason(userId, seasonId)

    // Sắp xếp nhật ký cố định để hash không bị lệch:
    // event_date -> server_timestamp -> id.
    const diaries = [...season.diary_entries]
      .sort((a, b) => {
        const byEventDate = a.event_date.getTime() - b.event_date.getTime()
        if (byEventDate !== 0) return byEventDate
        const byServerTimestamp = a.server_timestamp.getTime() - b.server_timestamp.getTime()
        if (byServerTimestamp !== 0) return byServerTimestamp
        return a.id.localeCompare(b.id)
      })
      .map((entry) => ({
        id: entry.id,
        eventType: entry.event_type,
        eventDate: toDateString(entry.event_date),
        serverTimestamp: toTimestampString(entry.server_timestamp),
        description: entry.description ?? null,
        extraData: normalizeJson(entry.extra_data),
        attachments: [...entry.diary_attachments]
          // Sắp xếp attachment cố định:
          // sort_order -> created_at -> id.
          .sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            const byCreatedAt = a.created_at.getTime() - b.created_at.getTime()
            if (byCreatedAt !== 0) return byCreatedAt
            return a.id.localeCompare(b.id)
          })
          .map((attachment) => ({
            id: attachment.id,
            fileUrl: attachment.file_url,
            mimeType: attachment.mime_type ?? null,
            sortOrder: attachment.sort_order,
            meta: normalizeJson(attachment.meta)
          }))
      }))

    // Canonical payload:
    // - chỉ chứa các field liên quan tới truy xuất nguồn gốc
    // - decimal đổi sang string để tránh sai khác biểu diễn số thực
    // - normalize lần cuối để thứ tự key ổn định
    const canonicalPayload = normalizeJson({
      schemaVersion: 1,
      season: {
        id: season.id,
        code: season.code,
        cropName: season.crop_name,
        status: season.status,
        startDate: toDateString(season.start_date),
        harvestStartDate: toDateString(season.harvest_start_date),
        harvestEndDate: toDateString(season.harvest_end_date),
        estimatedYield: season.estimated_yield?.toString() ?? null,
        actualYield: season.actual_yield?.toString() ?? null,
        yieldUnit: season.yield_unit ?? null,
        sealedAt: toTimestampString(season.sealed_at)
      },
      farm: {
        id: season.farms.id,
        ownerUserId: season.farms.owner_user_id,
        name: season.farms.name,
        areaHa: season.farms.area_ha?.toString() ?? null,
        cropMain: season.farms.crop_main ?? null,
        province: season.farms.province ?? null,
        district: season.farms.district ?? null,
        ward: season.farms.ward ?? null,
        address: season.farms.address ?? null,
        latitude: season.farms.latitude?.toString() ?? null,
        longitude: season.farms.longitude?.toString() ?? null,
        inCooperative: season.farms.in_cooperative
      },
      diaries
    })

    // Đầu vào hash là canonical JSON string (đã được chuẩn hóa cố định).
    const canonicalJson = JSON.stringify(canonicalPayload)
    const payloadHash = crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex')

    return {
      canonicalPayload,
      canonicalJson,
      payloadHash
    }
  }
}

const anchorService = new AnchorService()
export default anchorService
