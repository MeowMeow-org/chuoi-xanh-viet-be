import type { cert_type, coop_cert_status, farm_cert_status } from '@prisma/client'
import prisma from '~/lib/prisma'
import notificationService from '~/modules/notification/notification.service'
import { NotificationEntityType } from '~/modules/notification/notification.constants'

const FARM_EXPIRED_STATUS: farm_cert_status = 'expired'
const COOP_EXPIRED_STATUS: coop_cert_status = 'expired'

const CERT_TYPE_LABEL: Record<cert_type, string> = {
  vietgap: 'VietGAP',
  globalgap: 'GlobalGAP',
  organic: 'Hữu cơ',
  other: 'Chứng chỉ khác'
}

// Quét mỗi 6 tiếng — đủ để chứng chỉ hết hạn được đánh dấu trong vòng một ngày,
// đồng thời không tạo áp lực DB.
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000

let intervalHandle: NodeJS.Timeout | null = null
let isRunning = false

/** Ngày hôm nay theo giờ UTC, đặt về 00:00:00 để so sánh với cột DATE trong DB. */
function todayStartUtc(): Date {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return now
}

function fmtDate(value: Date | null | undefined): string {
  if (!value) return '—'
  return value.toISOString().slice(0, 10)
}

async function expireFarmCertificates(today: Date) {
  // Đã duyệt: hết hạn → expired (ẩn badge).
  // Chờ duyệt mà ngày hết hạn giấy đã qua: vẫn chuyển expired — hồ sơ không còn hợp lệ để duyệt theo giấy cũ.
  const expired = await prisma.farm_certificates.findMany({
    where: {
      status: { in: ['approved', 'pending'] },
      expires_at: { lt: today }
    },
    select: {
      id: true,
      type: true,
      status: true,
      certificate_no: true,
      expires_at: true,
      farm: {
        select: {
          id: true,
          name: true,
          owner_user_id: true
        }
      }
    }
  })

  if (expired.length === 0) return 0

  const ids = expired.map((c) => c.id)
  await prisma.farm_certificates.updateMany({
    where: { id: { in: ids } },
    data: { status: FARM_EXPIRED_STATUS }
  })

  for (const cert of expired) {
    const typeLabel = CERT_TYPE_LABEL[cert.type] ?? 'Chứng chỉ'
    const farmName = cert.farm?.name ?? 'nông trại'
    const certNo = cert.certificate_no ? ` số ${cert.certificate_no}` : ''
    const wasPending = cert.status === 'pending'
    try {
      await notificationService.create({
        recipientUserId: cert.farm.owner_user_id,
        type: 'system',
        title: wasPending ? 'Hồ sơ chứng chỉ quá hạn giấy' : 'Chứng chỉ đã hết hạn',
        body: wasPending
          ? `${typeLabel}${certNo} (${farmName}) — giấy đã hết hạn ngày ${fmtDate(cert.expires_at)} trước khi được duyệt. Hồ sơ chuyển sang Hết hạn. Vui lòng nộp chứng chỉ / bản gia hạn mới nếu cần.`
          : `${typeLabel}${certNo} của ${farmName} đã hết hạn (${fmtDate(cert.expires_at)}). Chứng chỉ sẽ không còn xuất hiện trên gian hàng. Vui lòng nộp chứng chỉ mới nếu bạn đã gia hạn.`,
        entityType: NotificationEntityType.FARM_CERTIFICATE,
        entityId: cert.id,
        dedupeKey: `cert-expired:farm:${cert.id}`
      })
    } catch (err) {
      console.error('[cert-worker] failed to notify farm cert expiry', cert.id, err)
    }
  }

  return expired.length
}

async function expireCoopCertificates(today: Date) {
  const expired = await prisma.cooperative_certificates.findMany({
    where: {
      status: 'active',
      expires_at: { lt: today }
    },
    select: {
      id: true,
      type: true,
      certificate_no: true,
      expires_at: true,
      cooperative_user_id: true
    }
  })

  if (expired.length === 0) return 0

  const ids = expired.map((c) => c.id)
  await prisma.cooperative_certificates.updateMany({
    where: { id: { in: ids } },
    data: { status: COOP_EXPIRED_STATUS }
  })

  for (const cert of expired) {
    const typeLabel = CERT_TYPE_LABEL[cert.type] ?? 'Chứng chỉ'
    const certNo = cert.certificate_no ? ` số ${cert.certificate_no}` : ''
    try {
      await notificationService.create({
        recipientUserId: cert.cooperative_user_id,
        type: 'system',
        title: 'Chứng chỉ HTX đã hết hạn',
        body: `${typeLabel}${certNo} của hợp tác xã đã hết hạn (${fmtDate(cert.expires_at)}). Các nông trại thành viên sẽ không còn thừa hưởng chứng chỉ này trên badge. Vui lòng cập nhật chứng chỉ mới.`,
        entityType: NotificationEntityType.COOP_CERTIFICATE,
        entityId: cert.id,
        dedupeKey: `cert-expired:coop:${cert.id}`
      })
    } catch (err) {
      console.error('[cert-worker] failed to notify coop cert expiry', cert.id, err)
    }
  }

  return expired.length
}

async function sweep() {
  if (isRunning) return
  isRunning = true
  const today = todayStartUtc()
  try {
    const [farmCount, coopCount] = await Promise.all([
      expireFarmCertificates(today),
      expireCoopCertificates(today)
    ])
    if (farmCount + coopCount > 0) {
      console.log(
        `[cert-worker] marked expired: farm=${farmCount} coop=${coopCount}`
      )
    }
  } catch (err) {
    console.error('[cert-worker] sweep error:', err)
  } finally {
    isRunning = false
  }
}

/**
 * Bật worker quét chứng chỉ hết hạn. Worker không chặn startup —
 * lần quét đầu tiên chạy sau 15s, sau đó mỗi SWEEP_INTERVAL_MS.
 */
export function startCertificateExpiryWorker() {
  if (intervalHandle != null) return
  console.log(
    '[cert-worker] started (interval =',
    SWEEP_INTERVAL_MS,
    'ms)'
  )
  intervalHandle = setInterval(() => {
    void sweep()
  }, SWEEP_INTERVAL_MS)
  setTimeout(() => void sweep(), 15_000)
}

export function stopCertificateExpiryWorker() {
  if (intervalHandle != null) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
