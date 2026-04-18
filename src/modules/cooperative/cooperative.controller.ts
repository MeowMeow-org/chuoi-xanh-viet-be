import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import cooperativeService from './cooperative.service'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'
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
  const searchTerm = typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined

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
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const status = typeof req.query.status === 'string' ? req.query.status : undefined

  const { items, meta } = await cooperativeService.listMembershipsForCooperative({
    cooperativeUserId: user_id,
    status: status as 'pending' | 'approved' | 'rejected' | 'removed' | undefined,
    page,
    limit
  })

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

  const approved = await cooperativeService.approveMembership({
    membershipId,
    cooperativeUserId: user_id
  })

  notificationDispatch.cooperativeApprovedForFarmer({
    farmerUserId: approved.farmerUserId,
    cooperativeUserId: user_id,
    farmId: approved.farmId
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

  const rejected = await cooperativeService.rejectMembership({
    membershipId,
    cooperativeUserId: user_id,
    note
  })

  notificationDispatch.cooperativeRejectedForFarmer({
    farmerUserId: rejected.farmerUserId,
    cooperativeUserId: user_id,
    farmId: rejected.farmId,
    note
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.COOPERATIVE_MEMBERSHIP_REJECT_SUCCESS,
    data: null
  })
}

export const listManagedFarmSeasonsController = async (
  req: Request<{ farmId: string }>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { seasons, farm } = await cooperativeService.listSeasonsOfManagedFarm({
    cooperativeUserId: user_id,
    farmId: req.params.farmId
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SEASONS_SUCCESS,
    data: {
      farm: farm
        ? {
            id: farm.id,
            name: farm.name,
            province: farm.province,
            district: farm.district,
            ward: farm.ward,
            inCooperative: farm.in_cooperative,
            owner: {
              id: farm.users.id,
              fullName: farm.users.full_name,
              email: farm.users.email,
              phone: farm.users.phone
            }
          }
        : null,
      seasons: seasons.map((s) => ({
        id: s.id,
        farmId: s.farm_id,
        code: s.code,
        cropName: s.crop_name,
        startDate: s.start_date,
        harvestStartDate: s.harvest_start_date,
        harvestEndDate: s.harvest_end_date,
        status: s.status,
        sealedAt: s.sealed_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        diaryCount: s._count.diary_entries
      }))
    }
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

  notificationDispatch.cooperativeJoinRequested({
    cooperativeUserId: row.cooperative_user_id,
    farmerUserId: user_id,
    farmId: row.farm_id,
    membershipId: row.id
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
