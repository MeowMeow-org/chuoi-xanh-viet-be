import { Prisma } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { domainEvents, DomainEventName } from '~/events/domain-events'
import prisma from '~/lib/prisma'
import { ErrorWithStatus } from '~/models/Errors'
import type { CreateInspectionRequestBody } from './inspection.request'

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

class InspectionService {
  /**
   * Kiểm tra cooperative user có quyền inspect farm này không:
   * phải là approved cooperative_member quản lý farm chứa season đó.
   */
  private async ensureCanInspect({ cooperativeUserId, seasonId }: { cooperativeUserId: string; seasonId: string }) {
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        farm_id: true,
        status: true
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    if (season.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.INSPECTION_SEASON_ANCHORED
      })
    }

    const membership = await prisma.cooperative_members.findFirst({
      where: {
        cooperative_user_id: cooperativeUserId,
        farm_id: season.farm_id,
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

    return season
  }

  /**
   * Kiểm tra user (cooperative/farmer/admin) có được xem inspection của season này không:
   * - Farmer: phải là owner của farm chứa season
   * - Cooperative: phải là approved member của farm
   * - Admin: full access
   */
  private async ensureCanViewSeason({ userId, seasonId }: { userId: string; seasonId: string }) {
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        farm_id: true,
        farms: {
          select: { owner_user_id: true }
        }
      }
    })

    if (season == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.SEASON_NOT_FOUND
      })
    }

    if (season.farms.owner_user_id === userId) return season

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    if (user?.role === 'admin') return season

    if (user?.role === 'cooperative') {
      const membership = await prisma.cooperative_members.findFirst({
        where: {
          cooperative_user_id: userId,
          farm_id: season.farm_id,
          status: 'approved'
        },
        select: { id: true }
      })
      if (membership != null) return season
    }

    throw new ErrorWithStatus({
      status: HTTP_STATUS.FORBIDDEN,
      message: USER_MESSAGES.INSPECTION_FORBIDDEN_NOT_MEMBER
    })
  }

  createInspection = async ({
    cooperativeUserId,
    payload
  }: {
    cooperativeUserId: string
    payload: CreateInspectionRequestBody
  }) => {
    const season = await this.ensureCanInspect({
      cooperativeUserId,
      seasonId: payload.seasonId
    })

    const eventDate = payload.eventDate ? new Date(payload.eventDate) : new Date()
    const extraData: Prisma.InputJsonValue = {
      verdict: payload.verdict,
      summary: payload.summary ?? null,
      inspectorRole: 'cooperative'
    }

    const created = await prisma.$transaction(async (tx) => {
      const entry = await tx.diary_entries.create({
        data: {
          season_id: payload.seasonId,
          farm_id: season.farm_id,
          actor_user_id: cooperativeUserId,
          event_type: 'inspection',
          event_date: eventDate,
          description: payload.summary ?? null,
          extra_data: extraData
        },
        select: diarySelect
      })

      if (payload.attachments != null && payload.attachments.length > 0) {
        await tx.diary_attachments.createMany({
          data: payload.attachments.map((att, idx) => ({
            diary_entry_id: entry.id,
            file_url: att.fileUrl,
            mime_type: att.mimeType ?? null,
            sort_order: att.sortOrder ?? idx,
            meta:
              att.objectKey != null && att.objectKey.trim().length > 0
                ? ({
                    objectKey: att.objectKey.trim()
                  } as Prisma.InputJsonValue)
                : Prisma.DbNull
          }))
        })
      }

      const attachments = await tx.diary_attachments.findMany({
        where: { diary_entry_id: entry.id },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
        select: attachmentSelect
      })

      return { entry, attachments }
    })

    domainEvents.emit(DomainEventName.DIARY_CREATED, { seasonId: season.id })
    return created
  }

  listInspections = async ({ userId, seasonId }: { userId: string; seasonId: string }) => {
    await this.ensureCanViewSeason({ userId, seasonId })

    const items = await prisma.diary_entries.findMany({
      where: {
        season_id: seasonId,
        event_type: 'inspection'
      },
      orderBy: [{ event_date: 'desc' }, { created_at: 'desc' }],
      select: {
        ...diarySelect,
        diary_attachments: {
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
          select: attachmentSelect
        },
        users: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        }
      }
    })

    return items
  }

  deleteInspection = async ({ cooperativeUserId, inspectionId }: { cooperativeUserId: string; inspectionId: string }) => {
    const inspection = await prisma.diary_entries.findFirst({
      where: {
        id: inspectionId,
        event_type: 'inspection'
      },
      select: {
        id: true,
        season_id: true,
        actor_user_id: true,
        seasons: {
          select: { status: true }
        }
      }
    })

    if (inspection == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.DIARY_NOT_FOUND
      })
    }

    if (inspection.actor_user_id !== cooperativeUserId) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.INSPECTION_FORBIDDEN_NOT_OWNER
      })
    }

    if (inspection.seasons.status === 'anchored') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.CONFLICT,
        message: USER_MESSAGES.INSPECTION_SEASON_ANCHORED
      })
    }

    await prisma.diary_entries.delete({ where: { id: inspectionId } })

    domainEvents.emit(DomainEventName.DIARY_DELETED, { seasonId: inspection.season_id })
  }
}

const inspectionService = new InspectionService()
export default inspectionService
