import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { createFarmController, getFarmsController } from './farm.controller'
import { createFarmBodyValidator, farmerRoleValidator, getFarmsQueryValidator } from './farm.middleware'

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
  farmerRoleValidator,
  createFarmBodyValidator,
  wrapAsync(createFarmController)
)

export default farmRouter
