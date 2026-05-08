import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import type { CreateFarmRequestBody, UpdateFarmRequestBody } from './farm.request'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'

const farmSelect = {
  id: true,
  owner_user_id: true,
  name: true,
  area_ha: true,
  crop_main: true,
  province: true,
  district: true,
  ward: true,
  province_code: true,
  district_code: true,
  ward_code: true,
  address: true,
  latitude: true,
  longitude: true,
  in_cooperative: true,
  created_at: true,
  updated_at: true
} as const

/** Danh sách nông trại của tôi: kèm trạng thái đơn HTX (tối đa 1 bản ghi / farm). */
const farmSelectMine = {
  ...farmSelect,
  cooperative_members: {
    select: {
      status: true,
      cooperative_user: { select: { full_name: true } }
    },
    take: 1,
    orderBy: { created_at: 'desc' as const }
  }
} satisfies Prisma.farmsSelect

function assertFarmGpsCoordinatePair(latitude: number, longitude: number) {
  const la = Number(latitude)
  const lo = Number(longitude)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USER_MESSAGES.FARM_GPS_INVALID
    })
  }
  if (la === 0 && lo === 0) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USER_MESSAGES.FARM_GPS_INVALID
    })
  }
  if (la < 8 || la > 24 || lo < 102 || lo > 110) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USER_MESSAGES.FARM_GPS_INVALID
    })
  }
}

class FarmService {
  private async ensureFarmOwner(farmId: string, userId: string) {
    const farm = await prisma.farms.findFirst({
      where: {
        id: farmId,
        owner_user_id: userId
      },
      select: { id: true }
    })

    if (farm == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN
      })
    }
  }

  createFarm = async ({
    owner_user_id,
    payload
  }: {
    owner_user_id: string
    payload: CreateFarmRequestBody
  }) => {
    if (payload.latitude === undefined || payload.longitude === undefined) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: USER_MESSAGES.FARM_GPS_REQUIRED
      })
    }
    assertFarmGpsCoordinatePair(payload.latitude, payload.longitude)
    return prisma.farms.create({
      data: {
        owner_user_id,
        name: payload.name,
        area_ha: payload.area_ha,
        crop_main: payload.crop_main,
        province: payload.province,
        district: payload.district,
        ward: payload.ward,
        province_code: payload.province_code ?? null,
        district_code: payload.district_code ?? null,
        ward_code: payload.ward_code ?? null,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        in_cooperative: payload.in_cooperative ?? false
      },
      select: farmSelect
    })
  }

  updateFarm = async ({
    farm_id,
    owner_user_id,
    payload
  }: {
    farm_id: string
    owner_user_id: string
    payload: UpdateFarmRequestBody
  }) => {
    await this.ensureFarmOwner(farm_id, owner_user_id)

    const latP = payload.latitude
    const lngP = payload.longitude
    if (latP !== undefined || lngP !== undefined) {
      if (latP === undefined || lngP === undefined) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USER_MESSAGES.FARM_GPS_INVALID
        })
      }
      assertFarmGpsCoordinatePair(latP, lngP)
    }

    const data: Prisma.farmsUncheckedUpdateInput = {}
    if (payload.name !== undefined) data.name = payload.name
    if (payload.area_ha !== undefined) data.area_ha = payload.area_ha
    if (payload.crop_main !== undefined) data.crop_main = payload.crop_main
    if (payload.province !== undefined) data.province = payload.province
    if (payload.district !== undefined) data.district = payload.district
    if (payload.ward !== undefined) data.ward = payload.ward
    if (payload.province_code !== undefined) data.province_code = payload.province_code ?? null
    if (payload.district_code !== undefined) data.district_code = payload.district_code ?? null
    if (payload.ward_code !== undefined) data.ward_code = payload.ward_code ?? null
    if (payload.address !== undefined) data.address = payload.address
    if (payload.latitude !== undefined) data.latitude = payload.latitude
    if (payload.longitude !== undefined) data.longitude = payload.longitude
    if (payload.in_cooperative !== undefined) data.in_cooperative = payload.in_cooperative

    return prisma.farms.update({
      where: { id: farm_id },
      data,
      select: farmSelect
    })
  }

  deleteFarm = async ({
    farm_id,
    owner_user_id
  }: {
    farm_id: string
    owner_user_id: string
  }) => {
    await this.ensureFarmOwner(farm_id, owner_user_id)

    const [seasonCount, membershipCount, diaryCount, shop] = await Promise.all([
      prisma.seasons.count({ where: { farm_id } }),
      prisma.cooperative_members.count({ where: { farm_id } }),
      prisma.diary_entries.count({ where: { farm_id } }),
      prisma.shops.findUnique({ where: { farm_id }, select: { id: true } })
    ])

    if (seasonCount > 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.FARM_DELETE_BLOCKED_SEASONS
      })
    }
    if (membershipCount > 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.FARM_DELETE_BLOCKED_COOP
      })
    }
    if (diaryCount > 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.FARM_DELETE_BLOCKED_DIARY
      })
    }
    if (shop != null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.FARM_DELETE_BLOCKED_SHOP
      })
    }

    await prisma.farms.delete({
      where: { id: farm_id }
    })
  }

  getFarms = async ({
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
    const where: Prisma.farmsWhereInput =
      term && term.length > 0
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { crop_main: { contains: term, mode: 'insensitive' } },
              { province: { contains: term, mode: 'insensitive' } },
              { district: { contains: term, mode: 'insensitive' } },
              { address: { contains: term, mode: 'insensitive' } }
            ]
          }
        : {}

    const [items, total] = await Promise.all([
      prisma.farms.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: farmSelect
      }),
      prisma.farms.count({ where })
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

  getFarmsByOwnerUserId = async ({
    ownerUserId,
    page = 1,
    limit = 10,
    searchTerm
  }: {
    ownerUserId: string
    page?: number
    limit?: number
    searchTerm?: string
  }) => {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = searchTerm?.trim()
    const searchWhere: Prisma.farmsWhereInput =
      term && term.length > 0
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { crop_main: { contains: term, mode: 'insensitive' } },
              { province: { contains: term, mode: 'insensitive' } },
              { district: { contains: term, mode: 'insensitive' } },
              { address: { contains: term, mode: 'insensitive' } }
            ]
          }
        : {}

    const where: Prisma.farmsWhereInput = {
      owner_user_id: ownerUserId,
      ...searchWhere
    }

    const [items, total] = await Promise.all([
      prisma.farms.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: farmSelectMine
      }),
      prisma.farms.count({ where })
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
}

const farmService = new FarmService()
export default farmService
