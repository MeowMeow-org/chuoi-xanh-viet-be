import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { getFarmsController } from './farm.controller'
import { getFarmsQueryValidator } from './farm.middleware'

const farmRouter = Router()

/**
 * @desc get all farms (search + pagination)
 * @route GET /farm/
 * @access private
 */
farmRouter.get(
  '/',
  accessTokenValidator,
  getFarmsQueryValidator,
  wrapAsync(getFarmsController)
)

export default farmRouter
