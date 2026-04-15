import { Prisma } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import type {
  AddDiaryAttachmentRequestBody,
  CreateDiaryRequestBody,
  GetDiariesQuery,
  UpdateDiaryRequestBody
} from './diary.request'

const diarySelect = {
  id: true,
  season_id: true,
  farm_id: true,
  actor_user_id: true,
  event_type: true,
  event_date: true,
  server_timestamp: true,
  description: true,
  extra_data: true,
  created_at: true
} as const

const attachmentSelect = {
  id: true,
  diary_entry_id: true,
  file_url: true,
  mime_type: true,
  sort_order: true,
  meta: true,
  created_at: true
} as const

class DiaryService {
  private async ensureSeasonFarmOwnership({
    userId,
    seasonId,
    farmId
  }: {
    userId: string
    seasonId: string
    farmId: string
  }) {
    const season = await prisma.seasons.findFirst({
      where: {
        id: seasonId,
        farm_id: farmId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        id: true,
        farm_id: true,
        status: true
      }
    })

    if (season == null) {
      const seasonById = await prisma.seasons.findUnique({
        where: { id: seasonId },
        select: { farm_id: true }
      })
      if (seasonById != null && seasonById.farm_id !== farmId) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.DIARY_FARM_SEASON_MISMATCH
        })
      }

      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FARM_NOT_FOUND_OR_FORBIDDEN
      })
    }

    return season
  }

  private async getOwnedDiary({ userId, diaryId }: { userId: string; diaryId: string }) {
    const diary = await prisma.diary_entries.findFirst({
      where: {
        id: diaryId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        ...diarySelect,
        seasons: {
          select: {
            status: true
          }
        }
      }
    })

    if (diary == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.DIARY_NOT_FOUND
      })
    }

    return diary
  }

  createDiary = async ({ userId, payload }: { userId: string; payload: CreateDiaryRequestBody }) => {
    const season = await this.ensureSeasonFarmOwnership({
      userId,
      seasonId: payload.seasonId,
      farmId: payload.farmId
    })

    return prisma.diary_entries.create({
      data: {
        season_id: payload.seasonId,
        farm_id: payload.farmId,
        actor_user_id: userId,
        event_type: payload.eventType,
        event_date: new Date(payload.eventDate),
        description: payload.description,
        extra_data: payload.extraData ?? Prisma.DbNull
      },
      select: diarySelect
    })
  }

  getDiaries = async ({ userId, query }: { userId: string; query: GetDiariesQuery }) => {
    const page = query.page ? Number(query.page) : 1
    const limit = query.limit ? Number(query.limit) : 10
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const where: Prisma.diary_entriesWhereInput = {
      farms: {
        owner_user_id: userId
      },
      ...(query.seasonId ? { season_id: query.seasonId } : {}),
      ...(query.farmId ? { farm_id: query.farmId } : {}),
      ...(query.eventType ? { event_type: query.eventType } : {})
    }

    const [items, total] = await Promise.all([
      prisma.diary_entries.findMany({
        where,
        orderBy: [{ event_date: 'desc' }, { server_timestamp: 'desc' }],
        skip,
        take: safeLimit,
        select: diarySelect
      }),
      prisma.diary_entries.count({ where })
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

  getDiaryDetail = async ({ userId, diaryId }: { userId: string; diaryId: string }) => {
    const diary = await prisma.diary_entries.findFirst({
      where: {
        id: diaryId,
        farms: {
          owner_user_id: userId
        }
      },
      select: {
        ...diarySelect,
        diary_attachments: {
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
          select: attachmentSelect
        }
      }
    })

    if (diary == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.DIARY_NOT_FOUND
      })
    }

    return diary
  }

  addDiaryAttachment = async ({
    userId,
    diaryId,
    payload
  }: {
    userId: string
    diaryId: string
    payload: AddDiaryAttachmentRequestBody
  }) => {
    const diary = await this.getOwnedDiary({ userId, diaryId })
    if (diary.seasons.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.DIARY_SEASON_IS_ANCHORED_CANNOT_UPDATE
      })
    }

    return prisma.diary_attachments.create({
      data: {
        diary_entry_id: diaryId,
        file_url: payload.fileUrl,
        mime_type: payload.mimeType ?? null,
        sort_order: payload.sortOrder ?? 0,
        meta: payload.meta ?? Prisma.DbNull
      },
      select: attachmentSelect
    })
  }

  deleteDiaryAttachment = async ({
    userId,
    diaryId,
    attachmentId
  }: {
    userId: string
    diaryId: string
    attachmentId: string
  }) => {
    const diary = await this.getOwnedDiary({ userId, diaryId })
    if (diary.seasons.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.DIARY_SEASON_IS_ANCHORED_CANNOT_UPDATE
      })
    }

    const deleted = await prisma.diary_attachments.deleteMany({
      where: {
        id: attachmentId,
        diary_entry_id: diaryId
      }
    })

    if (deleted.count === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.DIARY_ATTACHMENT_NOT_FOUND
      })
    }
  }

  updateDiary = async ({
    userId,
    diaryId,
    payload
  }: {
    userId: string
    diaryId: string
    payload: UpdateDiaryRequestBody
  }) => {
    const diary = await this.getOwnedDiary({ userId, diaryId })
    if (diary.seasons.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.DIARY_SEASON_IS_ANCHORED_CANNOT_UPDATE
      })
    }

    const data: Prisma.diary_entriesUncheckedUpdateInput = {}
    if (payload.eventType !== undefined) data.event_type = payload.eventType
    if (payload.eventDate !== undefined) data.event_date = new Date(payload.eventDate)
    if (payload.description !== undefined) data.description = payload.description
    if (payload.extraData !== undefined) data.extra_data = payload.extraData ?? Prisma.DbNull

    return prisma.diary_entries.update({
      where: { id: diaryId },
      data,
      select: diarySelect
    })
  }

  deleteDiary = async ({ userId, diaryId }: { userId: string; diaryId: string }) => {
    const diary = await this.getOwnedDiary({ userId, diaryId })
    if (diary.seasons.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.DIARY_SEASON_IS_ANCHORED_CANNOT_DELETE
      })
    }

    await prisma.diary_entries.delete({
      where: { id: diaryId }
    })
  }
}

const diaryService = new DiaryService()
export default diaryService
