import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import diaryService from './diary.service'
import type {
  AddDiaryAttachmentRequestBody,
  CreateDiaryRequestBody,
  GetDiariesQuery,
  UpdateDiaryRequestBody
} from './diary.request'

const mapDiaryRow = (diary: {
  id: string
  season_id: string
  farm_id: string
  actor_user_id: string
  event_type: string
  event_date: Date
  server_timestamp: Date
  description: string | null
  extra_data: unknown
  created_at: Date
}) => ({
  id: diary.id,
  seasonId: diary.season_id,
  farmId: diary.farm_id,
  actorUserId: diary.actor_user_id,
  eventType: diary.event_type,
  eventDate: diary.event_date,
  serverTimestamp: diary.server_timestamp,
  description: diary.description,
  extraData: diary.extra_data,
  createdAt: diary.created_at
})

const mapAttachmentRow = (row: {
  id: string
  diary_entry_id: string
  file_url: string
  mime_type: string | null
  sort_order: number
  meta: unknown
  created_at: Date
}) => ({
  id: row.id,
  diaryEntryId: row.diary_entry_id,
  fileUrl: row.file_url,
  mimeType: row.mime_type,
  sortOrder: row.sort_order,
  meta: row.meta,
  createdAt: row.created_at
})

export const createDiaryController = async (
  req: Request<ParamsDictionary, unknown, CreateDiaryRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const diary = await diaryService.createDiary({ userId: user_id, payload: req.body })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_DIARY_SUCCESS,
    data: mapDiaryRow(diary)
  })
}

export const getDiariesController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetDiariesQuery>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const response = await diaryService.getDiaries({ userId: user_id, query: req.query })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_DIARIES_SUCCESS,
    data: {
      items: response.items.map((item) => {
        const { diary_attachments: attachments, ...row } = item
        return {
          ...mapDiaryRow(row),
          attachments: attachments.map(mapAttachmentRow)
        }
      }),
      meta: response.meta
    }
  })
}

export const getDiaryDetailController = async (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const diary = await diaryService.getDiaryDetail({
    userId: user_id,
    diaryId: req.params.diary_id as string
  })

  const { diary_attachments: attachments, ...diaryRow } = diary

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_DIARY_DETAIL_SUCCESS,
    data: {
      ...mapDiaryRow(diaryRow),
      attachments: attachments.map(mapAttachmentRow)
    }
  })
}

export const addDiaryAttachmentController = async (
  req: Request<ParamsDictionary, unknown, AddDiaryAttachmentRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const row = await diaryService.addDiaryAttachment({
    userId: user_id,
    diaryId: req.params.diary_id as string,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.ADD_DIARY_ATTACHMENT_SUCCESS,
    data: mapAttachmentRow(row)
  })
}

export const deleteDiaryAttachmentController = async (
  req: Request<ParamsDictionary>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await diaryService.deleteDiaryAttachment({
    userId: user_id,
    diaryId: req.params.diary_id as string,
    attachmentId: req.params.attachment_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.DELETE_DIARY_ATTACHMENT_SUCCESS,
    data: null
  })
}

export const updateDiaryController = async (
  req: Request<ParamsDictionary, unknown, UpdateDiaryRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const diary = await diaryService.updateDiary({
    userId: user_id,
    diaryId: req.params.diary_id as string,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_DIARY_SUCCESS,
    data: mapDiaryRow(diary)
  })
}

export const deleteDiaryController = async (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await diaryService.deleteDiary({
    userId: user_id,
    diaryId: req.params.diary_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.DELETE_DIARY_SUCCESS,
    data: null
  })
}
