import { Request, Response, NextFunction } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import farmService from './farm.service'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { CreateFarmRequestBody, GetFarmsQuery } from './farm.request'
import type { TokenPayLoad } from '../auth/auth.request'

const mapFarmRow = (farm: {
  id: string
  owner_user_id: string
  name: string
  area_ha: unknown
  crop_main: string | null
  province: string | null
  district: string | null
  ward: string | null
  address: string | null
  latitude: unknown
  longitude: unknown
  in_cooperative: boolean
  created_at: Date
  updated_at: Date
}) => ({
  id: farm.id,
  ownerUserId: farm.owner_user_id,
  name: farm.name,
  areaHa: farm.area_ha,
  cropMain: farm.crop_main,
  province: farm.province,
  district: farm.district,
  ward: farm.ward,
  address: farm.address,
  latitude: farm.latitude,
  longitude: farm.longitude,
  inCooperative: farm.in_cooperative,
  createdAt: farm.created_at,
  updatedAt: farm.updated_at
})

export const getFarmsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetFarmsQuery>,
  res: Response,
  next: NextFunction
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const searchTerm =
    typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined

  const { items, meta } = await farmService.getFarms({ page, limit, searchTerm })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_FARMS_SUCCESS,
    data: {
      items: items.map(mapFarmRow),
      meta
    }
  })
}

export const createFarmController = async (
  req: Request<ParamsDictionary, unknown, CreateFarmRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const createdFarm = await farmService.createFarm({
    owner_user_id: user_id,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_FARM_SUCCESS,
    data: mapFarmRow(createdFarm)
  })
}
