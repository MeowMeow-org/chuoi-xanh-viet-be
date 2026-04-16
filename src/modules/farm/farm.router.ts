import { Router } from 'express'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { getFarmsController, getMyFarmsController } from './farm.controller'
import { getFarmsQueryValidator } from './farm.middleware'

const farmRouter = Router()

/**
 * @desc farms owned by the authenticated user (owner_user_id = JWT sub)
 * @route GET /farm/mine
 * @access private
 */
farmRouter.get('/mine', accessTokenValidator, requireFarmer, getFarmsQueryValidator, wrapAsync(getMyFarmsController))

/**
 * @desc get all farms (search + pagination)
 * @route GET /farm/
 * @access private
 */
farmRouter.get('/', accessTokenValidator, getFarmsQueryValidator, wrapAsync(getFarmsController))

export default farmRouter
