import { Request, Response, NextFunction } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import farmService from './farm.service'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'

export const getFarmsController = async (
  req: Request<ParamsDictionary, any, any, any>, //
  res: Response,
  next: NextFunction
) => {
  const farms = await farmService.getFarms()

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_FARMS_SUCCESS,
    data: farms.map((farm) => ({
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
      createdAt: farm.created_at,
      updatedAt: farm.updated_at
    }))
  })
}
