import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import authService from '~/modules/auth/auth.service'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import type { RegisterFarmerApplicantBody } from './cooperative.request'

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
    searchTerm
  }: {
    page?: number
    limit?: number
    searchTerm?: string
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()
    const where: Prisma.usersWhereInput = {
      role: 'cooperative',
      status: 'active',
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

  registerFarmerApplicant = async (payload: RegisterFarmerApplicantBody) => {
    const {
      email,
      password,
      full_name,
      phone,
      cooperative_user_id,
      farm_name
    } = payload

    const cooperative = await prisma.users.findFirst({
      where: {
        id: cooperative_user_id,
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

    const [existingEmail, existingPhone] = await Promise.all([
      prisma.users.findFirst({ where: { email } }),
      prisma.users.findFirst({ where: { phone } })
    ])

    if (existingEmail != null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.EMAIL_ALREADY_EXISTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    if (existingPhone != null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.PHONE_ALREADY_EXISTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    const { user, farm, membership } = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.users.create({
        data: {
          email,
          password_hash: password,
          full_name,
          phone,
          role: 'consumer',
          status: 'active'
        }
      })

      const createdFarm = await tx.farms.create({
        data: {
          owner_user_id: createdUser.id,
          name: farm_name,
          in_cooperative: false
        }
      })

      const createdMembership = await tx.cooperative_members.create({
        data: {
          cooperative_user_id,
          farmer_user_id: createdUser.id,
          farm_id: createdFarm.id,
          status: 'pending',
          requested_by: createdUser.id
        }
      })

      return {
        user: createdUser,
        farm: createdFarm,
        membership: createdMembership
      }
    })

    const user_id = user.id.toString()
    const { access_token, refresh_token } = await authService.createAuthSessionForUser({
      user_id,
      role: user.role,
      status: user.status
    })

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      },
      farm: {
        id: farm.id,
        name: farm.name
      },
      membership: {
        id: membership.id,
        status: membership.status,
        cooperativeUserId: membership.cooperative_user_id
      }
    }
  }

  approveMembership = async ({
    membershipId,
    cooperativeUserId
  }: {
    membershipId: string
    cooperativeUserId: string
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

    return { membershipId }
  }
}

const cooperativeService = new CooperativeService()
export default cooperativeService
