import type {
  Prisma,
  cert_type,
  coop_cert_status,
  farm_cert_status
} from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'
import { syncCoopCertExpiryForCooperative } from '~/modules/certificate/certificate.worker'
import { rankCooperativeCandidates } from './certificate.reviewer'

export type CertTypeInput = cert_type

export type CoopCertUpsertInput = {
  type: CertTypeInput
  certificate_no?: string | null
  issuer?: string | null
  issued_at?: Date | null
  expires_at?: Date | null
  file_url: string
}

export type FarmCertUpsertInput = {
  farm_id: string
  type: CertTypeInput
  certificate_no?: string | null
  issuer?: string | null
  issued_at?: Date | null
  expires_at?: Date | null
  file_url: string
}

function assertDatesOk(issued?: Date | null, expires?: Date | null) {
  if (issued && expires && expires < issued) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.BAD_REQUEST,
      message: USER_MESSAGES.CERT_EXPIRES_BEFORE_ISSUED
    })
  }
}

/** Một field ghi chú người duyệt (đồng ý / từ chối / thu hồi), tối đa 500 ký tự. */
function normalizeReviewerNote(input: string | undefined | null): string | null {
  if (input == null) return null
  const t = input.trim()
  if (!t) return null
  return t.length > 500 ? t.slice(0, 500) : t
}

function paginate(page = 1, limit = 10) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(100, Math.max(1, limit))
  return { safePage, safeLimit, skip: (safePage - 1) * safeLimit }
}

function metaFrom(total: number, safePage: number, safeLimit: number) {
  const totalPages = Math.ceil(total / safeLimit)
  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    previousPage: safePage > 1 ? safePage - 1 : null,
    nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
  }
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6371 * c
}

class CertificateService {
  private pickNearestCooperativeReviewer = async (farmId: string) => {
    const farm = await prisma.farms.findUnique({
      where: { id: farmId },
      select: {
        id: true,
        province_code: true,
        district_code: true,
        ward_code: true,
        latitude: true,
        longitude: true
      }
    })
    if (!farm) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.CERT_FARM_NOT_FOUND_OR_FORBIDDEN
      })
    }

    const coops = await prisma.users.findMany({
      where: { role: 'cooperative', status: 'active' },
      select: {
        id: true,
        created_at: true,
        cooperative_members_as_cooperative: {
          where: { status: 'approved' },
          select: {
            farms: {
              select: {
                latitude: true,
                longitude: true,
                province_code: true,
                district_code: true,
                ward_code: true
              }
            }
          }
        }
      }
    })

    const farmLat = toNumber(farm.latitude)
    const farmLng = toNumber(farm.longitude)

    const candidates = coops
      .map((coop) => {
        const memberFarms = coop.cooperative_members_as_cooperative.map(
          (m) => m.farms
        )
        if (memberFarms.length === 0) return null

        const withCoords = memberFarms
          .map((f) => {
            const lat = toNumber(f.latitude)
            const lng = toNumber(f.longitude)
            return lat != null && lng != null ? { lat, lng } : null
          })
          .filter((x): x is { lat: number; lng: number } => x != null)

        const centroid =
          withCoords.length > 0
            ? {
                lat:
                  withCoords.reduce((acc, c) => acc + c.lat, 0) /
                  withCoords.length,
                lng:
                  withCoords.reduce((acc, c) => acc + c.lng, 0) /
                  withCoords.length
              }
            : null

        const matchScore = memberFarms.reduce((best, mf) => {
          let score = 0
          if (farm.province_code != null && mf.province_code === farm.province_code)
            score += 10
          if (farm.district_code != null && mf.district_code === farm.district_code)
            score += 25
          if (farm.ward_code != null && mf.ward_code === farm.ward_code) score += 60
          return Math.max(best, score)
        }, 0)

        const distanceKm =
          farmLat != null && farmLng != null && centroid != null
            ? haversineKm(farmLat, farmLng, centroid.lat, centroid.lng)
            : null

        return {
          cooperativeUserId: coop.id,
          createdAt: coop.created_at,
          matchScore,
          distanceKm
        }
      })
      .filter(
        (
          row
        ): row is {
          cooperativeUserId: string
          createdAt: Date
          matchScore: number
          distanceKm: number | null
        } => row != null
      )

    if (candidates.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }

    return rankCooperativeCandidates(candidates)[0].cooperativeUserId
  }

  // ======== COOPERATIVE CERTIFICATES ========
  createCoopCert = async (
    cooperativeUserId: string,
    input: CoopCertUpsertInput
  ) => {
    assertDatesOk(input.issued_at, input.expires_at)
    const created = await prisma.cooperative_certificates.create({
      data: {
        cooperative_user_id: cooperativeUserId,
        type: input.type,
        certificate_no: input.certificate_no ?? null,
        issuer: input.issuer ?? null,
        issued_at: input.issued_at ?? null,
        expires_at: input.expires_at ?? null,
        file_url: input.file_url
      }
    })
    return created
  }

  listCoopCerts = async ({
    cooperativeUserId,
    status,
    type,
    page,
    limit
  }: {
    cooperativeUserId: string
    status?: coop_cert_status
    type?: cert_type
    page?: number
    limit?: number
  }) => {
    await syncCoopCertExpiryForCooperative(cooperativeUserId)
    const { safePage, safeLimit, skip } = paginate(page, limit)
    const where: Prisma.cooperative_certificatesWhereInput = {
      cooperative_user_id: cooperativeUserId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {})
    }
    const [items, total] = await Promise.all([
      prisma.cooperative_certificates.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        include: {
          _count: { select: { scope: true } }
        }
      }),
      prisma.cooperative_certificates.count({ where })
    ])
    return { items, meta: metaFrom(total, safePage, safeLimit) }
  }

  getCoopCertOrThrow = async (certificateId: string) => {
    const row = await prisma.cooperative_certificates.findUnique({
      where: { id: certificateId },
      include: {
        cooperative: {
          select: { id: true, full_name: true }
        }
      }
    })
    if (!row) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.CERT_NOT_FOUND
      })
    }
    return row
  }

  updateCoopCert = async (
    certificateId: string,
    cooperativeUserId: string,
    input: Partial<CoopCertUpsertInput>
  ) => {
    const row = await this.getCoopCertOrThrow(certificateId)
    if (row.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FORBIDDEN
      })
    }
    if (row.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }
    const issued = input.issued_at !== undefined ? input.issued_at : row.issued_at
    const expires =
      input.expires_at !== undefined ? input.expires_at : row.expires_at
    assertDatesOk(issued, expires)

    const updated = await prisma.cooperative_certificates.update({
      where: { id: certificateId },
      data: {
        type: input.type ?? undefined,
        certificate_no: input.certificate_no ?? undefined,
        issuer: input.issuer ?? undefined,
        issued_at: input.issued_at === undefined ? undefined : input.issued_at,
        expires_at: input.expires_at === undefined ? undefined : input.expires_at,
        file_url: input.file_url ?? undefined,
        updated_at: new Date()
      }
    })
    return updated
  }

  deleteCoopCert = async (certificateId: string, cooperativeUserId: string) => {
    const row = await this.getCoopCertOrThrow(certificateId)
    if (row.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FORBIDDEN
      })
    }
    await prisma.cooperative_certificates.delete({ where: { id: certificateId } })
  }

  revokeCoopCert = async ({
    certificateId,
    adminUserId,
    reason
  }: {
    certificateId: string
    adminUserId: string
    reason: string
  }) => {
    const row = await this.getCoopCertOrThrow(certificateId)
    if (row.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }
    const updated = await prisma.cooperative_certificates.update({
      where: { id: certificateId },
      data: {
        status: 'revoked',
        revoked_by: adminUserId,
        revoked_at: new Date(),
        revoke_reason: reason,
        updated_at: new Date()
      }
    })
    return updated
  }

  // ======== COOPERATIVE CERT SCOPE (danh sách thừa hưởng) ========
  addScopeFarm = async ({
    certificateId,
    cooperativeUserId,
    farmId
  }: {
    certificateId: string
    cooperativeUserId: string
    farmId: string
  }) => {
    const cert = await this.getCoopCertOrThrow(certificateId)
    if (cert.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FORBIDDEN
      })
    }
    if (cert.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }
    const membership = await prisma.cooperative_members.findFirst({
      where: {
        farm_id: farmId,
        cooperative_user_id: cooperativeUserId,
        status: 'approved'
      },
      select: { id: true }
    })
    if (!membership) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_SCOPE_FARM_NOT_MEMBER
      })
    }
    const existing = await prisma.cooperative_certificate_scope.findFirst({
      where: { certificate_id: certificateId, farm_id: farmId }
    })
    if (existing) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.CERT_SCOPE_ALREADY_EXISTS
      })
    }
    const created = await prisma.cooperative_certificate_scope.create({
      data: {
        certificate_id: certificateId,
        farm_id: farmId,
        added_by: cooperativeUserId
      }
    })
    return created
  }

  removeScopeFarm = async ({
    certificateId,
    cooperativeUserId,
    farmId
  }: {
    certificateId: string
    cooperativeUserId: string
    farmId: string
  }) => {
    const cert = await this.getCoopCertOrThrow(certificateId)
    if (cert.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FORBIDDEN
      })
    }
    const existing = await prisma.cooperative_certificate_scope.findFirst({
      where: { certificate_id: certificateId, farm_id: farmId }
    })
    if (!existing) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.CERT_SCOPE_NOT_FOUND
      })
    }
    await prisma.cooperative_certificate_scope.delete({
      where: { id: existing.id }
    })
  }

  listScopeOfCert = async ({
    certificateId,
    cooperativeUserId,
    page,
    limit,
    searchTerm
  }: {
    certificateId: string
    cooperativeUserId: string
    page?: number
    limit?: number
    searchTerm?: string
  }) => {
    const cert = await this.getCoopCertOrThrow(certificateId)
    if (cert.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FORBIDDEN
      })
    }

    const { safePage, safeLimit, skip } = paginate(page, limit)
    const term = searchTerm?.trim()

    const farmSearch: Prisma.farmsWhereInput | undefined =
      term && term.length > 0
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { province: { contains: term, mode: 'insensitive' } },
              { district: { contains: term, mode: 'insensitive' } },
              { ward: { contains: term, mode: 'insensitive' } },
              {
                users: { full_name: { contains: term, mode: 'insensitive' } }
              }
            ]
          }
        : undefined

    const where: Prisma.cooperative_certificate_scopeWhereInput = {
      certificate_id: certificateId,
      ...(farmSearch ? { farm: farmSearch } : {})
    }

    const [items, total] = await Promise.all([
      prisma.cooperative_certificate_scope.findMany({
        where,
        orderBy: { added_at: 'desc' },
        skip,
        take: safeLimit,
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              province: true,
              district: true,
              ward: true,
              owner_user_id: true,
              users: { select: { id: true, full_name: true } }
            }
          }
        }
      }),
      prisma.cooperative_certificate_scope.count({ where })
    ])

    return { items, meta: metaFrom(total, safePage, safeLimit) }
  }

  /**
   * Nông hộ đã duyệt trong HTX nhưng chưa nằm trong danh sách thừa hưởng chứng chỉ này (phân trang + tìm kiếm).
   */
  listEligibleMembersForCertScope = async ({
    certificateId,
    cooperativeUserId,
    page,
    limit,
    searchTerm
  }: {
    certificateId: string
    cooperativeUserId: string
    page?: number
    limit?: number
    searchTerm?: string
  }) => {
    const cert = await this.getCoopCertOrThrow(certificateId)
    if (cert.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FORBIDDEN
      })
    }

    const scoped = await prisma.cooperative_certificate_scope.findMany({
      where: { certificate_id: certificateId },
      select: { farm_id: true }
    })
    const scopedIds = scoped.map((s) => s.farm_id)

    const { safePage, safeLimit, skip } = paginate(page, limit)
    const term = searchTerm?.trim()

    const searchWhere: Prisma.cooperative_membersWhereInput | undefined =
      term && term.length > 0
        ? {
            OR: [
              {
                farmer_user: {
                  full_name: { contains: term, mode: 'insensitive' }
                }
              },
              {
                farmer_user: {
                  email: { contains: term, mode: 'insensitive' }
                }
              },
              { farms: { name: { contains: term, mode: 'insensitive' } } },
              { farms: { province: { contains: term, mode: 'insensitive' } } },
              { farms: { district: { contains: term, mode: 'insensitive' } } },
              { farms: { ward: { contains: term, mode: 'insensitive' } } }
            ]
          }
        : undefined

    const where: Prisma.cooperative_membersWhereInput = {
      cooperative_user_id: cooperativeUserId,
      status: 'approved',
      ...(scopedIds.length > 0 ? { farm_id: { notIn: scopedIds } } : {}),
      ...(searchWhere ?? {})
    }

    const [rows, total] = await Promise.all([
      prisma.cooperative_members.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        include: {
          farmer_user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone: true,
              role: true
            }
          },
          farms: {
            select: {
              id: true,
              name: true,
              province: true,
              district: true,
              ward: true,
              in_cooperative: true
            }
          }
        }
      }),
      prisma.cooperative_members.count({ where })
    ])

    return { items: rows, meta: metaFrom(total, safePage, safeLimit) }
  }

  // ======== FARM CERTIFICATES ========
  createFarmCert = async ({
    ownerUserId,
    input
  }: {
    ownerUserId: string
    input: FarmCertUpsertInput
  }) => {
    assertDatesOk(input.issued_at, input.expires_at)
    const farm = await prisma.farms.findFirst({
      where: { id: input.farm_id, owner_user_id: ownerUserId },
      select: { id: true }
    })
    if (!farm) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.CERT_FARM_NOT_FOUND_OR_FORBIDDEN
      })
    }

    const cooperativeReviewerUserId = await this.pickNearestCooperativeReviewer(
      input.farm_id
    )

    const created = await prisma.farm_certificates.create({
      data: {
        farm_id: input.farm_id,
        type: input.type,
        certificate_no: input.certificate_no ?? null,
        issuer: input.issuer ?? null,
        issued_at: input.issued_at ?? null,
        expires_at: input.expires_at ?? null,
        file_url: input.file_url,
        status: 'pending',
        approver_scope: 'cooperative',
        reviewer_cooperative_id: cooperativeReviewerUserId
      }
    })

    notificationDispatch.farmCertPendingReview({
      certificateId: created.id,
      farmId: input.farm_id,
      farmerUserId: ownerUserId,
      approverScope: 'cooperative',
      cooperativeReviewerUserId
    })

    return created
  }

  listFarmCertsForOwner = async ({
    ownerUserId,
    status,
    page,
    limit,
    farmId
  }: {
    ownerUserId: string
    status?: farm_cert_status
    page?: number
    limit?: number
    farmId?: string
  }) => {
    const { safePage, safeLimit, skip } = paginate(page, limit)
    const where: Prisma.farm_certificatesWhereInput = {
      farm: { owner_user_id: ownerUserId },
      ...(status ? { status } : {}),
      ...(farmId ? { farm_id: farmId } : {})
    }
    const [items, total] = await Promise.all([
      prisma.farm_certificates.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        include: {
          farm: { select: { id: true, name: true } },
          reviewer_cooperative: { select: { id: true, full_name: true } },
          reviewer_user: { select: { id: true, full_name: true, role: true } }
        }
      }),
      prisma.farm_certificates.count({ where })
    ])
    return { items, meta: metaFrom(total, safePage, safeLimit) }
  }

  listFarmCertsPendingForCoop = async ({
    cooperativeUserId,
    page,
    limit
  }: {
    cooperativeUserId: string
    page?: number
    limit?: number
  }) => {
    const { safePage, safeLimit, skip } = paginate(page, limit)
    const where: Prisma.farm_certificatesWhereInput = {
      reviewer_cooperative_id: cooperativeUserId,
      approver_scope: 'cooperative',
      status: 'pending'
    }
    const [items, total] = await Promise.all([
      prisma.farm_certificates.findMany({
        where,
        orderBy: { created_at: 'asc' },
        skip,
        take: safeLimit,
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              province: true,
              district: true,
              ward: true,
              users: { select: { id: true, full_name: true } }
            }
          }
        }
      }),
      prisma.farm_certificates.count({ where })
    ])
    return { items, meta: metaFrom(total, safePage, safeLimit) }
  }

  listFarmCertsPendingForAdmin = async ({
    page,
    limit
  }: {
    page?: number
    limit?: number
  }) => {
    const { safePage, safeLimit, skip } = paginate(page, limit)
    const where: Prisma.farm_certificatesWhereInput = {
      approver_scope: 'admin',
      status: 'pending'
    }
    const [items, total] = await Promise.all([
      prisma.farm_certificates.findMany({
        where,
        orderBy: { created_at: 'asc' },
        skip,
        take: safeLimit,
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              province: true,
              district: true,
              ward: true,
              users: { select: { id: true, full_name: true } }
            }
          }
        }
      }),
      prisma.farm_certificates.count({ where })
    ])
    return { items, meta: metaFrom(total, safePage, safeLimit) }
  }

  getFarmCertOrThrow = async (id: string) => {
    const row = await prisma.farm_certificates.findUnique({
      where: { id },
      include: {
        farm: { select: { id: true, owner_user_id: true, name: true } }
      }
    })
    if (!row) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.CERT_NOT_FOUND
      })
    }
    return row
  }

  approveFarmCert = async ({
    certificateId,
    reviewerUserId,
    reviewerRole,
    note
  }: {
    certificateId: string
    reviewerUserId: string
    reviewerRole: 'cooperative' | 'admin'
    /** Ghi chú gửi nông hộ trong thông báo (tùy chọn) */
    note?: string
  }) => {
    const row = await this.getFarmCertOrThrow(certificateId)
    if (row.status !== 'pending') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }
    if (reviewerRole === 'cooperative') {
      if (
        row.approver_scope !== 'cooperative' ||
        row.reviewer_cooperative_id !== reviewerUserId
      ) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: USER_MESSAGES.CERT_FORBIDDEN
        })
      }
    } else {
      if (row.approver_scope !== 'admin') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: USER_MESSAGES.CERT_FORBIDDEN
        })
      }
    }
    const updated = await prisma.farm_certificates.update({
      where: { id: certificateId },
      data: {
        status: 'approved',
        reviewed_by: reviewerUserId,
        reviewed_at: new Date(),
        reviewer_note: normalizeReviewerNote(note),
        updated_at: new Date()
      }
    })

    notificationDispatch.farmCertApprovedForFarmer({
      farmerUserId: row.farm.owner_user_id,
      reviewerUserId,
      reviewerRole,
      certificateId,
      farmId: row.farm.id,
      farmName: row.farm.name ?? 'Nông trại',
      certType: row.type,
      note
    })

    return updated
  }

  rejectFarmCert = async ({
    certificateId,
    reviewerUserId,
    reviewerRole,
    reason
  }: {
    certificateId: string
    reviewerUserId: string
    reviewerRole: 'cooperative' | 'admin'
    reason: string
  }) => {
    const row = await this.getFarmCertOrThrow(certificateId)
    if (row.status !== 'pending') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }
    if (reviewerRole === 'cooperative') {
      if (
        row.approver_scope !== 'cooperative' ||
        row.reviewer_cooperative_id !== reviewerUserId
      ) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: USER_MESSAGES.CERT_FORBIDDEN
        })
      }
    } else {
      if (row.approver_scope !== 'admin') {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: USER_MESSAGES.CERT_FORBIDDEN
        })
      }
    }
    const updated = await prisma.farm_certificates.update({
      where: { id: certificateId },
      data: {
        status: 'rejected',
        reviewed_by: reviewerUserId,
        reviewed_at: new Date(),
        reviewer_note: normalizeReviewerNote(reason),
        updated_at: new Date()
      }
    })

    notificationDispatch.farmCertRejectedForFarmer({
      farmerUserId: row.farm.owner_user_id,
      reviewerUserId,
      reviewerRole,
      certificateId,
      farmId: row.farm.id,
      farmName: row.farm.name ?? 'Nông trại',
      certType: row.type,
      reason
    })

    return updated
  }

  revokeFarmCert = async ({
    certificateId,
    adminUserId,
    reason
  }: {
    certificateId: string
    adminUserId: string
    reason: string
  }) => {
    const row = await this.getFarmCertOrThrow(certificateId)
    if (row.status !== 'approved') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CERT_INVALID_STATE
      })
    }
    const updated = await prisma.farm_certificates.update({
      where: { id: certificateId },
      data: {
        status: 'revoked',
        reviewed_by: adminUserId,
        reviewed_at: new Date(),
        reviewer_note: normalizeReviewerNote(reason),
        updated_at: new Date()
      }
    })
    return updated
  }
}

const certificateService = new CertificateService()
export default certificateService
