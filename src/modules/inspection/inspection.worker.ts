import prisma from '~/lib/prisma'
import notificationService from '~/modules/notification/notification.service'
import { NotificationEntityType } from '~/modules/notification/notification.constants'

/**
 * Worker nhắc HTX đi kiểm tra (inspection) định kỳ cho các mùa vụ đang hoạt động.
 *
 * Quy tắc "đến kỳ" (OR — chỉ cần trúng một là nhắc):
 *   R1. Chu kỳ tối thiểu: đã qua `INSPECTION_INTERVAL_DAYS` ngày kể từ lần kiểm tra
 *       HTX gần nhất (nếu chưa có → tính từ season.start_date).
 *   R2. Gần thu hoạch: còn ≤ `PRE_HARVEST_WINDOW_DAYS` ngày tới ngày dự kiến
 *       thu hoạch (`season.harvest_start_date`) mà CHƯA có kiểm tra trong
 *       `INSPECTION_INTERVAL_DAYS` ngày trước đó.
 *
 * Phạm vi: mùa có status ∈ ('draft', 'ready_to_anchor') — bỏ `anchored/amended/failed`.
 * Nhận: tất cả user HTX đang approved với farm chứa mùa.
 * Dedupe: 1 thông báo/mùa/tuần ISO → chống spam nếu quét nhiều lần.
 */

const INSPECTION_INTERVAL_DAYS = 14
const PRE_HARVEST_WINDOW_DAYS = 7

// Quét mỗi 24h — worker nhắc, không cần real-time.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000

let intervalHandle: NodeJS.Timeout | null = null
let isRunning = false

function todayStartUtc(): Date {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return now
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY)
}

/** Nhãn "tuần ISO" `YYYY-Www` — dùng cho dedupeKey (1 nhắc / mùa / tuần). */
function isoWeekLabel(d: Date): string {
  // Chuẩn ISO-8601: thứ Năm cùng tuần quyết định năm & tuần.
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayOfWeek = tmp.getUTCDay() || 7 // CN -> 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function fmtDate(value: Date | null | undefined): string {
  if (!value) return '—'
  return value.toISOString().slice(0, 10)
}

type SeasonRow = {
  id: string
  code: string
  crop_name: string
  start_date: Date
  harvest_start_date: Date | null
  farms: {
    id: string
    name: string
    cooperative_members: Array<{ cooperative_user_id: string }>
  }
}

async function fetchActiveSeasonsWithCoops(): Promise<SeasonRow[]> {
  return prisma.seasons.findMany({
    where: {
      status: { in: ['draft', 'ready_to_anchor'] },
      farms: {
        cooperative_members: { some: { status: 'approved' } }
      }
    },
    select: {
      id: true,
      code: true,
      crop_name: true,
      start_date: true,
      harvest_start_date: true,
      farms: {
        select: {
          id: true,
          name: true,
          cooperative_members: {
            where: { status: 'approved' },
            select: { cooperative_user_id: true }
          }
        }
      }
    }
  })
}

async function lastInspectionDate(seasonId: string): Promise<Date | null> {
  const last = await prisma.diary_entries.findFirst({
    where: { season_id: seasonId, event_type: 'inspection' },
    orderBy: { event_date: 'desc' },
    select: { event_date: true }
  })
  return last?.event_date ?? null
}

type DueReason = 'interval' | 'pre_harvest'

function evaluateDue(params: {
  today: Date
  startDate: Date
  harvestStartDate: Date | null
  lastInspection: Date | null
}): DueReason | null {
  const { today, startDate, harvestStartDate, lastInspection } = params

  const baseline = lastInspection ?? startDate
  const daysSinceBaseline = daysBetween(today, baseline)

  if (daysSinceBaseline >= INSPECTION_INTERVAL_DAYS) return 'interval'

  if (harvestStartDate != null) {
    const daysUntilHarvest = daysBetween(harvestStartDate, today)
    if (
      daysUntilHarvest >= 0 &&
      daysUntilHarvest <= PRE_HARVEST_WINDOW_DAYS &&
      daysSinceBaseline >= INSPECTION_INTERVAL_DAYS / 2 // ≥ 7 ngày không có inspection
    ) {
      return 'pre_harvest'
    }
  }

  return null
}

function buildMessage(params: {
  reason: DueReason
  farmName: string
  seasonCode: string
  cropName: string
  harvestStartDate: Date | null
  lastInspection: Date | null
  today: Date
}): { title: string; body: string } {
  const { reason, farmName, seasonCode, cropName, harvestStartDate, lastInspection, today } = params
  const cropLabel = cropName.trim() || 'mùa vụ'

  if (reason === 'pre_harvest' && harvestStartDate != null) {
    const daysLeft = Math.max(0, daysBetween(harvestStartDate, today))
    return {
      title: 'Sắp tới ngày thu hoạch — cần kiểm tra',
      body: `${farmName} · ${cropLabel} (mã ${seasonCode}) dự kiến thu hoạch ${fmtDate(
        harvestStartDate
      )} (còn ${daysLeft} ngày). Vui lòng sắp xếp kiểm tra trước khi thu hoạch.`
    }
  }

  const lastPart = lastInspection
    ? `Lần kiểm tra gần nhất: ${fmtDate(lastInspection)}.`
    : `Mùa vụ chưa có lần kiểm tra nào.`
  return {
    title: 'Đến kỳ kiểm tra nông hộ',
    body: `${farmName} · ${cropLabel} (mã ${seasonCode}). ${lastPart} Khuyến nghị kiểm tra tối thiểu mỗi ${INSPECTION_INTERVAL_DAYS} ngày.`
  }
}

async function notifyCoopsForSeason(params: {
  season: SeasonRow
  reason: DueReason
  lastInspection: Date | null
  today: Date
}): Promise<number> {
  const { season, reason, lastInspection, today } = params
  const { title, body } = buildMessage({
    reason,
    farmName: season.farms.name,
    seasonCode: season.code,
    cropName: season.crop_name,
    harvestStartDate: season.harvest_start_date,
    lastInspection,
    today
  })

  const weekLabel = isoWeekLabel(today)
  let sent = 0
  for (const member of season.farms.cooperative_members) {
    try {
      const created = await notificationService.create({
        recipientUserId: member.cooperative_user_id,
        type: 'system',
        title,
        body,
        entityType: NotificationEntityType.SEASON_INSPECTION_DUE,
        entityId: season.id,
        dedupeKey: `inspection-due:season:${season.id}:user:${member.cooperative_user_id}:week:${weekLabel}`,
        metadata: {
          farmId: season.farms.id,
          seasonId: season.id,
          reason
        }
      })
      if (created) sent += 1
    } catch (err) {
      console.error('[inspection-worker] failed to notify coop', member.cooperative_user_id, err)
    }
  }
  return sent
}

async function sweep() {
  if (isRunning) return
  isRunning = true
  const today = todayStartUtc()
  try {
    const seasons = await fetchActiveSeasonsWithCoops()
    if (seasons.length === 0) return

    let dueCount = 0
    let notifiedCount = 0

    for (const season of seasons) {
      if (season.farms.cooperative_members.length === 0) continue

      const lastInspection = await lastInspectionDate(season.id)
      const reason = evaluateDue({
        today,
        startDate: season.start_date,
        harvestStartDate: season.harvest_start_date,
        lastInspection
      })
      if (reason == null) continue

      dueCount += 1
      notifiedCount += await notifyCoopsForSeason({ season, reason, lastInspection, today })
    }

    if (dueCount > 0) {
      console.log(
        `[inspection-worker] due seasons=${dueCount}, notifications created=${notifiedCount}`
      )
    }
  } catch (err) {
    console.error('[inspection-worker] sweep error:', err)
  } finally {
    isRunning = false
  }
}

/**
 * Bật worker nhắc inspection. Lần đầu chạy sau 20s, sau đó mỗi SWEEP_INTERVAL_MS.
 */
export function startInspectionDueWorker() {
  if (intervalHandle != null) return
  console.log('[inspection-worker] started (interval =', SWEEP_INTERVAL_MS, 'ms)')
  intervalHandle = setInterval(() => {
    void sweep()
  }, SWEEP_INTERVAL_MS)
  setTimeout(() => void sweep(), 20_000)
}

export function stopInspectionDueWorker() {
  if (intervalHandle != null) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
