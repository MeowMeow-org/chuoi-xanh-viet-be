import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import cooperativeService from './cooperative.service'
import type {
  GetHtxListQuery,
  RegisterFarmerApplicantBody,
  RejectMembershipBody
} from './cooperative.request'

export const listHtxController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetHtxListQuery>,
  res: Response,
  next: NextFunction
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const searchTerm =
    typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined

  const { items, meta } = await cooperativeService.listHtx({
    page,
    limit,
    searchTerm
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_HTX_LIST_SUCCESS,
    data: {
      items: items.map((u) => ({
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdAt: u.created_at
      })),
      meta
    }
  })
}

export const registerFarmerApplicantController = async (
  req: Request<ParamsDictionary, unknown, RegisterFarmerApplicantBody>,
  res: Response,
  next: NextFunction
) => {
  const result = await cooperativeService.registerFarmerApplicant(req.body)

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.REGISTER_FARMER_APPLICANT_SUCCESS,
    data: {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      user: {
        id: result.user.id,
        fullName: result.user.full_name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
        status: result.user.status
      },
      farm: result.farm,
      membership: result.membership
    }
  })
}

export const approveMembershipController = async (
  req: Request<{ membershipId: string }>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const membershipId = req.params.membershipId

  await cooperativeService.approveMembership({
    membershipId,
    cooperativeUserId: user_id
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_APPROVE_SUCCESS,
    data: null
  })
}

export const rejectMembershipController = async (
  req: Request<{ membershipId: string }, unknown, RejectMembershipBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const membershipId = req.params.membershipId
  const note = req.body.note

  await cooperativeService.rejectMembership({
    membershipId,
    cooperativeUserId: user_id,
    note
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_REJECT_SUCCESS,
    data: null
  })
}
