import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import type { CreateSeasonRequestBody, GetSeasonsQuery, UpdateSeasonRequestBody } from './season.request'
import seasonService from './season.service'

const mapSeasonRow = (season: {
  id: string
  farm_id: string
  code: string
  crop_name: string
  start_date: Date
  harvest_start_date: Date | null
  harvest_end_date: Date | null
  estimated_yield: unknown
  actual_yield: unknown
  yield_unit: string | null
  status: string
  sealed_at: Date | null
  created_by: string
  created_at: Date
  updated_at: Date
}) => ({
  id: season.id,
  farmId: season.farm_id,
  code: season.code,
  cropName: season.crop_name,
  startDate: season.start_date,
  harvestStartDate: season.harvest_start_date,
  harvestEndDate: season.harvest_end_date,
  estimatedYield: season.estimated_yield,
  actualYield: season.actual_yield,
  yieldUnit: season.yield_unit,
  status: season.status,
  sealedAt: season.sealed_at,
  createdBy: season.created_by,
  createdAt: season.created_at,
  updatedAt: season.updated_at
})

export const createSeasonController = async (
  req: Request<ParamsDictionary, unknown, CreateSeasonRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const season = await seasonService.createSeason({ userId: user_id, payload: req.body })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_SEASON_SUCCESS,
    data: mapSeasonRow(season)
  })
}

export const getSeasonsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetSeasonsQuery>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const response = await seasonService.getSeasons({ userId: user_id, query: req.query })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SEASONS_SUCCESS,
    data: {
      items: response.items.map(mapSeasonRow),
      meta: response.meta
    }
  })
}

export const getSeasonDetailController = async (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const season = await seasonService.getSeasonDetail({
    userId: user_id,
    seasonId: req.params.season_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SEASON_DETAIL_SUCCESS,
    data: mapSeasonRow(season)
  })
}

export const updateSeasonController = async (
  req: Request<ParamsDictionary, unknown, UpdateSeasonRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const season = await seasonService.updateSeason({
    userId: user_id,
    seasonId: req.params.season_id as string,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_SEASON_SUCCESS,
    data: mapSeasonRow(season)
  })
}

export const deleteSeasonController = async (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await seasonService.deleteSeason({
    userId: user_id,
    seasonId: req.params.season_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.DELETE_SEASON_SUCCESS,
    data: null
  })
}
