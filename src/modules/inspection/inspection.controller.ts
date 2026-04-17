import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import inspectionService from './inspection.service'
import type { CreateInspectionRequestBody, ListInspectionsQuery } from './inspection.request'

const mapAttachmentRow = (row: {
  id: string
  diary_entry_id: string
  file_url: string
  mime_type: string | null
  sort_order: number
  meta: unknown
  created_at: Date
}) => {
  const metaObject =
    row.meta != null && typeof row.meta === 'object' ? (row.meta as Record<string, unknown>) : null
  return {
    id: row.id,
    diaryEntryId: row.diary_entry_id,
    fileUrl: row.file_url,
    objectKey: typeof metaObject?.objectKey === 'string' ? metaObject.objectKey : null,
    mimeType: row.mime_type,
    sortOrder: row.sort_order,
    meta: row.meta,
    createdAt: row.created_at
  }
}

const mapInspectionRow = (row: {
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
  diary_attachments?: Array<Parameters<typeof mapAttachmentRow>[0]>
  users?: { id: string; full_name: string; email: string | null } | null
}) => ({
  id: row.id,
  seasonId: row.season_id,
  farmId: row.farm_id,
  actorUserId: row.actor_user_id,
  eventType: row.event_type,
  eventDate: row.event_date,
  serverTimestamp: row.server_timestamp,
  description: row.description,
  extraData: row.extra_data,
  createdAt: row.created_at,
  attachments: (row.diary_attachments ?? []).map(mapAttachmentRow),
  inspector: row.users
    ? {
        id: row.users.id,
        fullName: row.users.full_name,
        email: row.users.email
      }
    : null
})

export const createInspectionController = async (
  req: Request<ParamsDictionary, unknown, CreateInspectionRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { entry, attachments } = await inspectionService.createInspection({
    cooperativeUserId: user_id,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_INSPECTION_SUCCESS,
    data: mapInspectionRow({ ...entry, diary_attachments: attachments })
  })
}

export const listInspectionsController = async (
  req: Request<ParamsDictionary, unknown, unknown, ListInspectionsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const items = await inspectionService.listInspections({
    userId: user_id,
    seasonId: req.query.seasonId as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_INSPECTIONS_SUCCESS,
    data: items.map(mapInspectionRow)
  })
}

export const deleteInspectionController = async (req: Request<ParamsDictionary>, res: Response, _next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await inspectionService.deleteInspection({
    cooperativeUserId: user_id,
    inspectionId: req.params.inspection_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.DELETE_INSPECTION_SUCCESS,
    data: null
  })
}
