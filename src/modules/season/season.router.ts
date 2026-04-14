import { Router } from 'express'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createSeasonController,
  deleteSeasonController,
  getSeasonDetailController,
  getSeasonsController,
  updateSeasonController
} from './season.controller'
import {
  createSeasonValidator,
  getSeasonsQueryValidator,
  seasonIdValidator,
  updateSeasonValidator
} from './season.middleware'

const seasonRouter = Router()

/**
 * @desc Create season
 * @route POST /season/
 * @access private (farmer)
 */
seasonRouter.post(
  '/',
  accessTokenValidator,
  requireFarmer,
  createSeasonValidator,
  wrapAsync(createSeasonController)
)

/**
 * @desc Get seasons with pagination/filter
 * @route GET /season/
 * @access private (farmer)
 */
seasonRouter.get(
  '/',
  accessTokenValidator,
  requireFarmer,
  getSeasonsQueryValidator,
  wrapAsync(getSeasonsController)
)

/**
 * @desc Get season detail
 * @route GET /season/:season_id
 * @access private (farmer)
 */
seasonRouter.get(
  '/:season_id',
  accessTokenValidator,
  requireFarmer,
  seasonIdValidator,
  wrapAsync(getSeasonDetailController)
)

/**
 * @desc Update season
 * @route PATCH /season/:season_id
 * @access private (farmer)
 */
seasonRouter.patch(
  '/:season_id',
  accessTokenValidator,
  requireFarmer,
  seasonIdValidator,
  updateSeasonValidator,
  wrapAsync(updateSeasonController)
)

/**
 * @desc Delete season
 * @route DELETE /season/:season_id
 * @access private (farmer)
 */
seasonRouter.delete(
  '/:season_id',
  accessTokenValidator,
  requireFarmer,
  seasonIdValidator,
  wrapAsync(deleteSeasonController)
)

export default seasonRouter
