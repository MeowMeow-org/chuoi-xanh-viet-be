import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import cooperativeService from './cooperative.service'
import type {
  GetHtxListQuery,
  GetMyMembershipsQuery,
  RejectMembershipBody,
  RequestJoinCooperativeBody
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

export const listMyMembershipsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetMyMembershipsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page =
    req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit =
    req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const status =
    typeof req.query.status === 'string' ? req.query.status : undefined

  const { items, meta } = await cooperativeService.listMembershipsForCooperative(
    {
      cooperativeUserId: user_id,
      status: status as
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'removed'
        | undefined,
      page,
      limit
    }
  )

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_COOPERATIVE_MEMBERSHIPS_SUCCESS,
    data: {
      items: items.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        verifiedAt: row.verified_at,
        note: row.note,
        farmer: {
          id: row.farmer_user.id,
          fullName: row.farmer_user.full_name,
          email: row.farmer_user.email,
          phone: row.farmer_user.phone,
          role: row.farmer_user.role
        },
        farm: {
          id: row.farms.id,
          name: row.farms.name,
          province: row.farms.province,
          district: row.farms.district,
          ward: row.farms.ward,
          inCooperative: row.farms.in_cooperative
        }
      })),
      meta
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

export const requestJoinCooperativeController = async (
  req: Request<ParamsDictionary, unknown, RequestJoinCooperativeBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const row = await cooperativeService.requestJoinCooperative({
    farmerUserId: user_id,
    cooperativeUserId: req.body.cooperative_user_id,
    farmId: req.body.farm_id
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.COOPERATIVE_JOIN_REQUEST_SUCCESS,
    data: {
      membershipId: row.id,
      status: row.status,
      cooperativeUserId: row.cooperative_user_id,
      farmId: row.farm_id
    }
  })
}
