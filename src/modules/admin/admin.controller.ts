import type { account_status, user_role } from '@prisma/client'
import type { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '~/modules/auth/auth.request'
import type { BroadcastAudience } from './admin.service'
import adminService from './admin.service'

export const getDashboardSummaryController = async (_req: Request, res: Response) => {
  const data = await adminService.getDashboardSummary()
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.ADMIN_DASHBOARD_SUMMARY_SUCCESS,
    data
  })
}

export const listUsersController = async (
  req: Request<
    ParamsDictionary,
    unknown,
    unknown,
    {
      page?: string
      limit?: string
      q?: string
      role?: string
      status?: string
    }
  >,
  res: Response
) => {
  const page = req.query.page ? Number(req.query.page) : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const q = req.query.q
  const role = req.query.role as user_role | undefined
  const status = req.query.status as account_status | undefined

  const data = await adminService.listUsers({
    page,
    limit,
    q,
    role,
    status
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.ADMIN_USERS_LIST_SUCCESS,
    data
  })
}

export const getUserByIdController = async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  const data = await adminService.getUserById(req.params.userId)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.ADMIN_USER_DETAIL_SUCCESS,
    data
  })
}

export const patchUserStatusController = async (
  req: Request<{ userId: string }, unknown, { status: 'active' | 'suspended' }>,
  res: Response
) => {
  const data = await adminService.updateUserStatus(req.params.userId, req.body.status)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.ADMIN_USER_STATUS_UPDATED,
    data
  })
}

export const postBroadcastNotificationsController = async (
  req: Request<
    ParamsDictionary,
    unknown,
    {
      title: string
      body: string
      audience: BroadcastAudience
      linkPath?: string | null
    }
  >,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await adminService.broadcastSystemNotifications({
    actorUserId: user_id,
    title: req.body.title,
    body: req.body.body,
    audience: req.body.audience,
    linkPath: req.body.linkPath
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.ADMIN_BROADCAST_SUCCESS,
    data
  })
}
