import prisma from '~/lib/prisma'
import type { cert_type } from '@prisma/client'

export type CertificateBadgeSource =
  | {
      kind: 'own'
      certificateId: string
      certificateNo: string | null
      issuer: string | null
      issuedAt: Date | null
      expiresAt: Date | null
      fileUrl: string
    }
  | {
      kind: 'cooperative'
      certificateId: string
      cooperativeUserId: string
      cooperativeName: string | null
      certificateNo: string | null
      issuer: string | null
      issuedAt: Date | null
      expiresAt: Date | null
      fileUrl: string
    }

export type CertificateBadge = {
  type: cert_type
  active: boolean
  sources: CertificateBadgeSource[]
}

const todayStartUtc = () => {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return now
}

const isNotExpired = (expires: Date | null | undefined) => {
  if (!expires) return true
  return expires >= todayStartUtc()
}

/**
 * Tính danh sách badge (mỗi cert_type một badge) cho một farm:
 *  - Own: farm_certificates approved + còn hạn
 *  - Inherited (qua HTX): cooperative_certificate_scope + cooperative_certificates active + còn hạn,
 *    và farm còn là thành viên approved của HTX đó.
 */
export async function resolveFarmCertificateBadges(
  farmId: string
): Promise<CertificateBadge[]> {
  const [ownCerts, scopeRows] = await Promise.all([
    prisma.farm_certificates.findMany({
      where: { farm_id: farmId, status: 'approved' },
      orderBy: { created_at: 'desc' }
    }),
    prisma.cooperative_certificate_scope.findMany({
      where: { farm_id: farmId },
      include: {
        certificate: {
          include: {
            cooperative: { select: { id: true, full_name: true } }
          }
        }
      }
    })
  ])

  const activeCoopMembership = await prisma.cooperative_members.findMany({
    where: { farm_id: farmId, status: 'approved' },
    select: { cooperative_user_id: true }
  })
  const activeCoopSet = new Set(
    activeCoopMembership.map((m) => m.cooperative_user_id)
  )

  const byType = new Map<cert_type, CertificateBadgeSource[]>()

  for (const cert of ownCerts) {
    if (!isNotExpired(cert.expires_at)) continue
    const list = byType.get(cert.type) ?? []
    list.push({
      kind: 'own',
      certificateId: cert.id,
      certificateNo: cert.certificate_no,
      issuer: cert.issuer,
      issuedAt: cert.issued_at,
      expiresAt: cert.expires_at,
      fileUrl: cert.file_url
    })
    byType.set(cert.type, list)
  }

  for (const row of scopeRows) {
    const cert = row.certificate
    if (cert.status !== 'active') continue
    if (!isNotExpired(cert.expires_at)) continue
    if (!activeCoopSet.has(cert.cooperative_user_id)) continue
    const list = byType.get(cert.type) ?? []
    list.push({
      kind: 'cooperative',
      certificateId: cert.id,
      cooperativeUserId: cert.cooperative_user_id,
      cooperativeName: cert.cooperative.full_name,
      certificateNo: cert.certificate_no,
      issuer: cert.issuer,
      issuedAt: cert.issued_at,
      expiresAt: cert.expires_at,
      fileUrl: cert.file_url
    })
    byType.set(cert.type, list)
  }

  const badges: CertificateBadge[] = []
  for (const [type, sources] of byType.entries()) {
    badges.push({
      type,
      active: sources.length > 0,
      sources
    })
  }
  return badges
}

/** Batch version: trả map farmId -> badges */
export async function resolveFarmCertificateBadgesMany(
  farmIds: string[]
): Promise<Map<string, CertificateBadge[]>> {
  const result = new Map<string, CertificateBadge[]>()
  if (farmIds.length === 0) return result

  const [ownCerts, scopeRows, memberships] = await Promise.all([
    prisma.farm_certificates.findMany({
      where: { farm_id: { in: farmIds }, status: 'approved' }
    }),
    prisma.cooperative_certificate_scope.findMany({
      where: { farm_id: { in: farmIds } },
      include: {
        certificate: {
          include: {
            cooperative: { select: { id: true, full_name: true } }
          }
        }
      }
    }),
    prisma.cooperative_members.findMany({
      where: { farm_id: { in: farmIds }, status: 'approved' },
      select: { farm_id: true, cooperative_user_id: true }
    })
  ])

  const coopByFarm = new Map<string, Set<string>>()
  for (const m of memberships) {
    const set = coopByFarm.get(m.farm_id) ?? new Set<string>()
    set.add(m.cooperative_user_id)
    coopByFarm.set(m.farm_id, set)
  }

  for (const farmId of farmIds) {
    const byType = new Map<cert_type, CertificateBadgeSource[]>()
    const activeCoopSet = coopByFarm.get(farmId) ?? new Set<string>()

    for (const cert of ownCerts) {
      if (cert.farm_id !== farmId) continue
      if (!isNotExpired(cert.expires_at)) continue
      const list = byType.get(cert.type) ?? []
      list.push({
        kind: 'own',
        certificateId: cert.id,
        certificateNo: cert.certificate_no,
        issuer: cert.issuer,
        issuedAt: cert.issued_at,
        expiresAt: cert.expires_at,
        fileUrl: cert.file_url
      })
      byType.set(cert.type, list)
    }

    for (const row of scopeRows) {
      if (row.farm_id !== farmId) continue
      const cert = row.certificate
      if (cert.status !== 'active') continue
      if (!isNotExpired(cert.expires_at)) continue
      if (!activeCoopSet.has(cert.cooperative_user_id)) continue
      const list = byType.get(cert.type) ?? []
      list.push({
        kind: 'cooperative',
        certificateId: cert.id,
        cooperativeUserId: cert.cooperative_user_id,
        cooperativeName: cert.cooperative.full_name,
        certificateNo: cert.certificate_no,
        issuer: cert.issuer,
        issuedAt: cert.issued_at,
        expiresAt: cert.expires_at,
        fileUrl: cert.file_url
      })
      byType.set(cert.type, list)
    }

    const badges: CertificateBadge[] = []
    for (const [type, sources] of byType.entries()) {
      badges.push({ type, active: sources.length > 0, sources })
    }
    result.set(farmId, badges)
  }

  return result
}

/** Serialize về JSON-friendly shape cho client */
export function serializeBadges(badges: CertificateBadge[]) {
  return badges.map((b) => ({
    type: b.type,
    active: b.active,
    sources: b.sources.map((s) =>
      s.kind === 'own'
        ? {
            kind: 'own' as const,
            certificateId: s.certificateId,
            certificateNo: s.certificateNo,
            issuer: s.issuer,
            issuedAt: s.issuedAt,
            expiresAt: s.expiresAt,
            fileUrl: s.fileUrl
          }
        : {
            kind: 'cooperative' as const,
            certificateId: s.certificateId,
            cooperativeUserId: s.cooperativeUserId,
            cooperativeName: s.cooperativeName,
            certificateNo: s.certificateNo,
            issuer: s.issuer,
            issuedAt: s.issuedAt,
            expiresAt: s.expiresAt,
            fileUrl: s.fileUrl
          }
    )
  }))
}
