import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { getFarmsController } from './farm.controller'

const farmRouter = Router()

/**
 * @desc get all farms
 * @route GET /farm/
 * @access private
 */
farmRouter.get('/', accessTokenValidator, wrapAsync(getFarmsController))

export default farmRouter
