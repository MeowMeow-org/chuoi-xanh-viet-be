import type { diary_event_type, Prisma } from '@prisma/client'

export interface DiaryParams {
  diary_id: string
}

export interface CreateDiaryRequestBody {
  seasonId: string
  farmId: string
  eventType: diary_event_type
  eventDate: string
  description?: string
  extraData?: Prisma.InputJsonValue | null
}

export interface UpdateDiaryRequestBody {
  eventType?: diary_event_type
  eventDate?: string
  description?: string | null
  extraData?: Prisma.InputJsonValue | null
}

export interface GetDiariesQuery {
  seasonId?: string
  farmId?: string
  eventType?: diary_event_type
  page?: string
  limit?: string
}

export interface AddDiaryAttachmentRequestBody {
  fileUrl: string
  mimeType?: string | null
  sortOrder?: number
  meta?: Prisma.InputJsonValue | null
}
