import type { Prisma, season_status } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import type {
  CreateSeasonRequestBody,
  GetSeasonsQuery,
  UpdateSeasonRequestBody
} from './season.request'

const seasonSelect = {
  id: true,
  farm_id: true,
  code: true,
  crop_name: true,
  start_date: true,
  harvest_start_date: true,
  harvest_end_date: true,
  estimated_yield: true,
  actual_yield: true,
  yield_unit: true,
  status: true,
  sealed_at: true,
  created_by: true,
  created_at: true,
  updated_at: true
} as const

class SeasonService {
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

  createSeason = async ({ userId, payload }: { userId: string; payload: CreateSeasonRequestBody }) => {
    await this.ensureFarmOwner(payload.farmId, userId)

    return prisma.seasons.create({
      data: {
        farm_id: payload.farmId,
        code: payload.code,
        crop_name: payload.cropName,
        start_date: new Date(payload.startDate),
        harvest_start_date: payload.harvestStartDate ? new Date(payload.harvestStartDate) : null,
        harvest_end_date: payload.harvestEndDate ? new Date(payload.harvestEndDate) : null,
        estimated_yield: payload.estimatedYield ?? null,
        actual_yield: payload.actualYield ?? null,
        yield_unit: payload.yieldUnit ?? 'kg',
        created_by: userId
      },
      select: seasonSelect
    })
  }

  getSeasons = async ({ userId, query }: { userId: string; query: GetSeasonsQuery }) => {
    const page = query.page ? Number(query.page) : 1
    const limit = query.limit ? Number(query.limit) : 10
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const term = query.searchTerm?.trim()
    const where: Prisma.seasonsWhereInput = {
      farms: {
        owner_user_id: userId
      },
      ...(query.farmId ? { farm_id: query.farmId } : {}),
      ...(query.status ? { status: query.status as season_status } : {}),
      ...(term && term.length > 0
        ? {
            OR: [
              { code: { contains: term, mode: 'insensitive' } },
              { crop_name: { contains: term, mode: 'insensitive' } }
            ]
          }
        : {})
    }

    const [items, total] = await Promise.all([
      prisma.seasons.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: seasonSelect
      }),
      prisma.seasons.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    const previousPage = safePage > 1 ? safePage - 1 : null
    const nextPage = totalPages > 0 && safePage < totalPages ? safePage + 1 : null

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

  getSeasonDetail = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farms: {
          owner_user_id: userId
        }
      },
      select: seasonSelect
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    return season
  }

  updateSeason = async ({
    userId,
    seasonId,
    payload
  }: {
    userId: string
    seasonId: string
    payload: UpdateSeasonRequestBody
  }) => {
    await this.getSeasonDetail({ userId, seasonId })

    const data: Prisma.seasonsUncheckedUpdateInput = {}
    if (payload.code !== undefined) data.code = payload.code
    if (payload.cropName !== undefined) data.crop_name = payload.cropName
    if (payload.startDate !== undefined) data.start_date = new Date(payload.startDate)
    if (payload.harvestStartDate !== undefined) {
      data.harvest_start_date = payload.harvestStartDate ? new Date(payload.harvestStartDate) : null
    }
    if (payload.harvestEndDate !== undefined) {
      data.harvest_end_date = payload.harvestEndDate ? new Date(payload.harvestEndDate) : null
    }
    if (payload.estimatedYield !== undefined) {
      data.estimated_yield = payload.estimatedYield
    }
    if (payload.actualYield !== undefined) {
      data.actual_yield = payload.actualYield
    }
    if (payload.yieldUnit !== undefined) {
      data.yield_unit = payload.yieldUnit
    }

    return prisma.seasons.update({
      where: { id: seasonId },
      data,
      select: seasonSelect
    })
  }

  deleteSeason = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        id: true,
        _count: {
          select: {
            diary_entries: true,
            products: true,
            sale_units: true
          }
        }
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    const relatedCount =
      season._count.diary_entries + season._count.products + season._count.sale_units

    if (relatedCount > 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.SEASON_HAS_RELATED_DATA
      })
    }

    await prisma.seasons.delete({
      where: { id: seasonId }
    })
  }
}

const seasonService = new SeasonService()
export default seasonService
