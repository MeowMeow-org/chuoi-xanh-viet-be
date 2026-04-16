import { Router } from 'express'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { createFarmController, deleteFarmController, getFarmsController, updateFarmController } from './farm.controller'
import {
  createFarmBodyValidator,
  farmIdParamValidator,
  getFarmsQueryValidator,
  updateFarmBodyValidator
} from './farm.middleware'

const farmRouter = Router()

/**
 * @desc get all farms (search + pagination)
 * @route GET /farm/
 * @access private
 */
farmRouter.get('/', accessTokenValidator, getFarmsQueryValidator, wrapAsync(getFarmsController))

/**
 * @desc create farm
 * @route POST /farm/
 * @access private (farmer only)
 */
farmRouter.post(
  '/',
  accessTokenValidator,
  requireFarmer,
  createFarmBodyValidator,
  wrapAsync(createFarmController)
)

/**
 * @desc update farm
 * @route PATCH /farm/:farm_id
 * @access private (farmer only)
 */
farmRouter.patch(
  '/:farm_id',
  accessTokenValidator,
  requireFarmer,
  farmIdParamValidator,
  updateFarmBodyValidator,
  wrapAsync(updateFarmController)
)

/**
 * @desc delete farm
 * @route DELETE /farm/:farm_id
 * @access private (farmer only)
 */
farmRouter.delete(
  '/:farm_id',
  accessTokenValidator,
  requireFarmer,
  farmIdParamValidator,
  wrapAsync(deleteFarmController)
)

export default farmRouter
