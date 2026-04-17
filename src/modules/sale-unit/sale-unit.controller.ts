import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import saleUnitService from './sale-unit.service'
import type { CreateSaleUnitRequestBody, ListSaleUnitsQuery } from './sale-unit.request'

const mapSaleUnitRow = (row: {
  id: string
  season_id: string
  code: string
  quantity: unknown
  unit: string
  qr_token: string
  qr_url: string
  short_code: string | null
  status: string
  created_at: Date
}) => ({
  id: row.id,
  seasonId: row.season_id,
  code: row.code,
  quantity: typeof row.quantity === 'object' && row.quantity !== null ? row.quantity.toString() : row.quantity,
  unit: row.unit,
  qrToken: row.qr_token,
  qrUrl: row.qr_url,
  shortCode: row.short_code,
  status: row.status,
  createdAt: row.created_at
})

export const createSaleUnitController = async (
  req: Request<ParamsDictionary, unknown, CreateSaleUnitRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const row = await saleUnitService.createSaleUnit({ userId: user_id, payload: req.body })
  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.SALE_UNIT_CREATE_SUCCESS,
    data: mapSaleUnitRow(row)
  })
}

export const listSaleUnitsController = async (
  req: Request<ParamsDictionary, unknown, unknown, ListSaleUnitsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await saleUnitService.listSaleUnits({
    userId: user_id,
    seasonId: req.query.seasonId as string
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.SALE_UNIT_LIST_SUCCESS,
    data: {
      items: result.items.map(mapSaleUnitRow),
      totals: {
        actualYield: result.totals.actualYield,
        yieldUnit: result.totals.yieldUnit,
        actualYieldKg: result.totals.actualYieldKg,
        allocatedKg: result.totals.allocatedKg,
        remainingKg: result.totals.remainingKg
      }
    }
  })
}

export const deleteSaleUnitController = async (
  req: Request<ParamsDictionary>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await saleUnitService.deleteSaleUnit({
    userId: user_id,
    saleUnitId: req.params.sale_unit_id as string
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.SALE_UNIT_DELETE_SUCCESS,
    data: null
  })
}
