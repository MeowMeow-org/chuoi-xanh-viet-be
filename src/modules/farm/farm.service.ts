import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import type { CreateFarmRequestBody } from './farm.request'

const farmSelect = {
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
  in_cooperative: true,
  created_at: true,
  updated_at: true
} as const

class FarmService {
  createFarm = async ({
    owner_user_id,
    payload
  }: {
    owner_user_id: string
    payload: CreateFarmRequestBody
  }) => {
    return prisma.farms.create({
      data: {
        owner_user_id,
        name: payload.name,
        area_ha: payload.area_ha,
        crop_main: payload.crop_main,
        province: payload.province,
        district: payload.district,
        ward: payload.ward,
        address: payload.address,
        latitude: payload.latitude,
        longitude: payload.longitude,
        in_cooperative: payload.in_cooperative ?? false
      },
      select: farmSelect
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
}

const farmService = new FarmService()
export default farmService
