import type { Prisma, cooperative_member_status } from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'

const htxSelect = {
  id: true,
  full_name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  created_at: true
} as const

class CooperativeService {
  listHtx = async ({
    page = 1,
    limit = 10,
    searchTerm,
    id
  }: {
    page?: number
    limit?: number
    searchTerm?: string
    /** Lọc đúng một HTX (vd. trang xác nhận đơn gia nhập) */
    id?: string
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()
    const idTrim = id?.trim()
    const where: Prisma.usersWhereInput = {
      role: 'cooperative',
      status: 'active',
      ...(idTrim && idTrim.length > 0 ? { id: idTrim } : {}),
      ...(term && term.length > 0
        ? {
            OR: [
              { full_name: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
              { phone: { contains: term, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: htxSelect
      }),
      prisma.users.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    const previousPage = safePage > 1 ? safePage - 1 : null
    const nextPage =
      totalPages > 0 && safePage < totalPages ? safePage + 1 : null

    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage,
        nextPage
      }
    }
  }

  /**
   * Farmer đã có tài khoản + nông trại: gửi đơn gia nhập HTX (cooperative_members.pending).
   */
  requestJoinCooperative = async ({
    farmerUserId,
    cooperativeUserId,
    farmId
  }: {
    farmerUserId: string
    cooperativeUserId: string
    farmId: string
  }) => {
    const cooperative = await prisma.users.findFirst({
      where: {
        id: cooperativeUserId,
        role: 'cooperative',
        status: 'active'
      },
      select: { id: true }
    })

    if (cooperative == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_USER_NOT_FOUND,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    const farm = await prisma.farms.findFirst({
      where: { id: farmId, owner_user_id: farmerUserId },
      select: { id: true, in_cooperative: true }
    })

    if (farm == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    if (farm.in_cooperative) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.FARM_ALREADY_LINKED_TO_COOPERATIVE,
        status: HTTP_STATUS.CONFLICT
      })
    }

    const existing = await prisma.cooperative_members.findFirst({
      where: { farm_id: farmId }
    })

    if (existing != null) {
      if (existing.status === 'approved') {
        throw new ErrorWithStatus({
          message: USER_MESSAGES.FARM_ALREADY_LINKED_TO_COOPERATIVE,
          status: HTTP_STATUS.CONFLICT
        })
      }

      if (existing.status === 'pending') {
        if (existing.cooperative_user_id === cooperativeUserId) {
          return {
            id: existing.id,
            status: existing.status,
            cooperative_user_id: existing.cooperative_user_id,
            farm_id: existing.farm_id
          }
        }
        throw new ErrorWithStatus({
          message: USER_MESSAGES.COOPERATIVE_JOIN_PENDING_EXISTS,
          status: HTTP_STATUS.CONFLICT
        })
      }

      if (existing.status === 'rejected' || existing.status === 'removed') {
        const updated = await prisma.cooperative_members.update({
          where: { id: existing.id },
          data: {
            cooperative_user_id: cooperativeUserId,
            farmer_user_id: farmerUserId,
            status: 'pending',
            requested_by: farmerUserId,
            verified_by: null,
            verified_at: null,
            note: null
          }
        })
        notificationDispatch.cooperativeJoinRequested({
          cooperativeUserId,
          farmerUserId,
          farmId,
          membershipId: updated.id
        })
        return {
          id: updated.id,
          status: updated.status,
          cooperative_user_id: updated.cooperative_user_id,
          farm_id: updated.farm_id
        }
      }
    }

    const created = await prisma.cooperative_members.create({
      data: {
        cooperative_user_id: cooperativeUserId,
        farmer_user_id: farmerUserId,
        farm_id: farmId,
        status: 'pending',
        requested_by: farmerUserId
      }
    })

    notificationDispatch.cooperativeJoinRequested({
      cooperativeUserId,
      farmerUserId,
      farmId,
      membershipId: created.id
    })

    return {
      id: created.id,
      status: created.status,
      cooperative_user_id: created.cooperative_user_id,
      farm_id: created.farm_id
    }
  }

  approveMembership = async ({
    membershipId,
    cooperativeUserId,
    note
  }: {
    membershipId: string
    cooperativeUserId: string
    /** Ghi chú gửi nông hộ qua thông báo (không lưu DB) */
    note?: string
  }) => {
    const row = await prisma.cooperative_members.findUnique({
      where: { id: membershipId }
    })

    if (row == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (row.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_FORBIDDEN,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    if (row.status !== 'pending') {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_INVALID_STATE,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await prisma.$transaction([
      prisma.cooperative_members.update({
        where: { id: membershipId },
        data: {
          status: 'approved',
          verified_by: cooperativeUserId,
          verified_at: new Date()
        }
      }),
      prisma.users.update({
        where: { id: row.farmer_user_id },
        data: { role: 'farmer' }
      }),
      prisma.farms.update({
        where: { id: row.farm_id },
        data: { in_cooperative: true }
      })
    ])

    notificationDispatch.cooperativeApprovedForFarmer({
      farmerUserId: row.farmer_user_id,
      cooperativeUserId,
      farmId: row.farm_id,
      note
    })

    return { membershipId, farmerUserId: row.farmer_user_id, farmId: row.farm_id }
  }

  rejectMembership = async ({
    membershipId,
    cooperativeUserId,
    note
  }: {
    membershipId: string
    cooperativeUserId: string
    note?: string
  }) => {
    const row = await prisma.cooperative_members.findUnique({
      where: { id: membershipId }
    })

    if (row == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (row.cooperative_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_FORBIDDEN,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    if (row.status !== 'pending') {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_INVALID_STATE,
        status: HTTP_STATUS.BAD_REQUEST
      })
    }

    await prisma.cooperative_members.update({
      where: { id: membershipId },
      data: {
        status: 'rejected',
        verified_by: cooperativeUserId,
        verified_at: new Date(),
        ...(note != null && note.length > 0 ? { note } : {})
      }
    })

    notificationDispatch.cooperativeRejectedForFarmer({
      farmerUserId: row.farmer_user_id,
      cooperativeUserId,
      farmId: row.farm_id,
      note
    })

    return { membershipId }
  }

  /**
   * List seasons of a farm mà cooperative đang quản lý (approved member).
   * Dùng cho trang inspection / overview của HTX.
   */
  listSeasonsOfManagedFarm = async ({
    cooperativeUserId,
    farmId
  }: {
    cooperativeUserId: string
    farmId: string
  }) => {
    const membership = await prisma.cooperative_members.findFirst({
      where: {
        cooperative_user_id: cooperativeUserId,
        farm_id: farmId,
        status: 'approved'
      },
      select: { id: true }
    })

    if (membership == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.INSPECTION_FORBIDDEN_NOT_MEMBER
      })
    }

    const seasons = await prisma.seasons.findMany({
      where: { farm_id: farmId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        farm_id: true,
        code: true,
        crop_name: true,
        start_date: true,
        harvest_start_date: true,
        harvest_end_date: true,
        status: true,
        sealed_at: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            diary_entries: true
          }
        }
      }
    })

    const farm = await prisma.farms.findUnique({
      where: { id: farmId },
      select: {
        id: true,
        name: true,
        province: true,
        district: true,
        ward: true,
        in_cooperative: true,
        users: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    return { seasons, farm }
  }

  listMembershipsForCooperative = async ({
    cooperativeUserId,
    status,
    page = 1,
    limit = 10,
    searchTerm
  }: {
    cooperativeUserId: string
    status?: cooperative_member_status
    page?: number
    limit?: number
    searchTerm?: string
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

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
              {
                farmer_user: {
                  phone: { contains: term, mode: 'insensitive' }
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
      ...(status != null ? { status } : {}),
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

    const totalPages = Math.ceil(total / safeLimit)
    const previousPage = safePage > 1 ? safePage - 1 : null
    const nextPage =
      totalPages > 0 && safePage < totalPages ? safePage + 1 : null

    return {
      items: rows,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage,
        nextPage
      }
    }
  }
}

const cooperativeService = new CooperativeService()
export default cooperativeService
