import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { user_role } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import type { TokenPayLoad } from '../auth/auth.request'
import notificationService from './notification.service'

async function resolveViewerRole(userId: string, tokenRole?: user_role): Promise<user_role> {
  if (tokenRole) return tokenRole
  const u = await prisma.users.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return u?.role ?? 'consumer'
}

export const listNotificationsController = async (
  req: Request<ParamsDictionary, unknown, unknown, { page?: string; limit?: string; unread_only?: string }>,
  res: Response
) => {
  const decoded = req.decoded_authorization as TokenPayLoad
  const viewerRole = await resolveViewerRole(decoded.user_id, decoded.role)

  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const unreadOnly = req.query.unread_only === '1' || req.query.unread_only === 'true'

  const data = await notificationService.listForUser({
    userId: decoded.user_id,
    viewerRole,
    page,
    limit,
    unreadOnly
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_NOTIFICATIONS_SUCCESS,
    data
  })
}

export const markNotificationReadController = async (req: Request<{ notification_id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await notificationService.markRead(req.params.notification_id, user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.MARK_NOTIFICATION_READ_SUCCESS,
    data: null
  })
}

export const markAllNotificationsReadController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await notificationService.markAllRead(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.MARK_ALL_NOTIFICATIONS_READ_SUCCESS,
    data: null
  })
}
