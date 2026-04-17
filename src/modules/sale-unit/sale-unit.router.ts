import { Router } from 'express'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createSaleUnitController,
  deleteSaleUnitController,
  listSaleUnitsController
} from './sale-unit.controller'
import {
  createSaleUnitValidator,
  listSaleUnitsValidator,
  saleUnitIdValidator
} from './sale-unit.middleware'

const saleUnitRouter = Router()

/**
 * @desc Create a sale unit (lô/bao/thùng) for an anchored season → auto-gen QR
 * @route POST /sale-unit
 * @access private (farmer, owner of the season's farm)
 */
saleUnitRouter.post(
  '/',
  accessTokenValidator,
  requireFarmer,
  createSaleUnitValidator,
  wrapAsync(createSaleUnitController)
)

/**
 * @desc List sale units of a season
 * @route GET /sale-unit?seasonId=
 * @access private (farmer owner)
 */
saleUnitRouter.get(
  '/',
  accessTokenValidator,
  requireFarmer,
  listSaleUnitsValidator,
  wrapAsync(listSaleUnitsController)
)

/**
 * @desc Delete / disable sale unit (soft-delete if already scanned)
 * @route DELETE /sale-unit/:sale_unit_id
 * @access private (farmer owner)
 */
saleUnitRouter.delete(
  '/:sale_unit_id',
  accessTokenValidator,
  requireFarmer,
  saleUnitIdValidator,
  wrapAsync(deleteSaleUnitController)
)

export default saleUnitRouter
