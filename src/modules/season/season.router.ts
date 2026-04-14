import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
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

seasonRouter.post(
  '/',
  accessTokenValidator,
  createSeasonValidator,
  wrapAsync(createSeasonController)
)

seasonRouter.get(
  '/',
  accessTokenValidator,
  getSeasonsQueryValidator,
  wrapAsync(getSeasonsController)
)

seasonRouter.get(
  '/:season_id',
  accessTokenValidator,
  seasonIdValidator,
  wrapAsync(getSeasonDetailController)
)

seasonRouter.patch(
  '/:season_id',
  accessTokenValidator,
  seasonIdValidator,
  updateSeasonValidator,
  wrapAsync(updateSeasonController)
)

seasonRouter.delete(
  '/:season_id',
  accessTokenValidator,
  seasonIdValidator,
  wrapAsync(deleteSeasonController)
)

export default seasonRouter
