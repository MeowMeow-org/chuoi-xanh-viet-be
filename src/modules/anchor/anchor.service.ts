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

const seasonFullInclude = {
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
} as const

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
      include: seasonFullInclude
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    return season
  }

  private async getSeasonBySeasonId(seasonId: string) {
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      include: seasonFullInclude
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    return season
  }

  /**
   * Hash để verify: phải khớp cách tính lúc neo.
   * - Schema v2: không đưa `status` / `sealed_at` vào payload (tránh lệch sau khi seal).
   * - Schema v1 (cũ): hash tính **trước** khi UPDATE status→anchored → dùng snapshot ready_to_anchor + sealedAt null
   *   cho bản `auto_anchored`; bản checkpoint tay `manual` dùng trạng thái DB hiện tại.
   */
  buildCanonicalForVerify = async (
    seasonId: string,
    referenceAnchor: {
      anchor_meta: unknown
      checkpoint_type: string
    } | null
  ) => {
    const season = await this.getSeasonBySeasonId(seasonId)
    if (referenceAnchor == null) {
      return this.buildCanonicalFromSeason(season, { schemaVersion: 2 })
    }
    const meta = referenceAnchor.anchor_meta as { canonicalSchemaVersion?: number } | undefined
    const schemaVersion = meta?.canonicalSchemaVersion ?? 1
    if (schemaVersion >= 2) {
      return this.buildCanonicalFromSeason(season, { schemaVersion: 2 })
    }
    const v1SealSnapshot = referenceAnchor.checkpoint_type !== 'manual'
    return this.buildCanonicalFromSeason(season, { schemaVersion: 1, v1SealSnapshot })
  }

  buildCanonicalPayload = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    const season = await this.getOwnedSeason(userId, seasonId)
    return this.buildCanonicalFromSeason(season, { schemaVersion: 2 })
  }

  private buildCanonicalFromSeason = (season: {
    id: string
    code: string
    crop_name: string
    status: string
    start_date: Date
    harvest_start_date: Date | null
    harvest_end_date: Date | null
    estimated_yield: { toString(): string } | null
    actual_yield: { toString(): string } | null
    yield_unit: string | null
    sealed_at: Date | null
    farms: {
      id: string
      owner_user_id: string
      name: string
      area_ha: { toString(): string } | null
      crop_main: string | null
      province: string | null
      district: string | null
      ward: string | null
      address: string | null
      latitude: { toString(): string } | null
      longitude: { toString(): string } | null
      in_cooperative: boolean
    }
    diary_entries: Array<{
      id: string
      event_type: string
      event_date: Date
      server_timestamp: Date
      description: string | null
      extra_data: unknown
      diary_attachments: Array<{
        id: string
        file_url: string
        mime_type: string | null
        sort_order: number
        created_at: Date
        meta: unknown
      }>
    }>
  }, options: { schemaVersion: 1 | 2; v1SealSnapshot?: boolean }) => {

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

    const useV2 = options.schemaVersion >= 2
    const v1Snap = options.schemaVersion === 1 && options.v1SealSnapshot === true
    const lifecycleStatus = v1Snap ? 'ready_to_anchor' : season.status
    const lifecycleSealedAt = v1Snap ? null : toTimestampString(season.sealed_at)

    // Canonical payload:
    // - v2: bỏ status/sealedAt (thay đổi ngay sau lúc neo → không phải dữ liệu truy xuất)
    // - v1: giữ để tương thích anchor cũ; verify dùng v1SealSnapshot cho auto_anchored
    // - decimal đổi sang string; normalize lần cuối
    const seasonPayload = useV2
      ? {
          id: season.id,
          code: season.code,
          cropName: season.crop_name,
          startDate: toDateString(season.start_date),
          harvestStartDate: toDateString(season.harvest_start_date),
          harvestEndDate: toDateString(season.harvest_end_date),
          estimatedYield: season.estimated_yield?.toString() ?? null,
          actualYield: season.actual_yield?.toString() ?? null,
          yieldUnit: season.yield_unit ?? null
        }
      : {
          id: season.id,
          code: season.code,
          cropName: season.crop_name,
          status: lifecycleStatus,
          startDate: toDateString(season.start_date),
          harvestStartDate: toDateString(season.harvest_start_date),
          harvestEndDate: toDateString(season.harvest_end_date),
          estimatedYield: season.estimated_yield?.toString() ?? null,
          actualYield: season.actual_yield?.toString() ?? null,
          yieldUnit: season.yield_unit ?? null,
          sealedAt: lifecycleSealedAt
        }

    const canonicalPayload = normalizeJson({
      schemaVersion: useV2 ? 2 : 1,
      season: seasonPayload,
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
