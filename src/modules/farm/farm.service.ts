import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'

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
