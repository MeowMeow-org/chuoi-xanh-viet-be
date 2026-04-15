import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { getCanonicalPayloadPreviewController } from './anchor.controller'
import { seasonAnchorIdValidator } from './anchor.middleware'

const anchorRouter = Router()

/**
 * @desc Preview canonical payload and SHA-256 hash for one season
 * @route GET /anchor/season/:season_id/canonical-payload
 * @access private (farmer)
 */
anchorRouter.get(
  '/season/:season_id/canonical-payload',
  accessTokenValidator,
  requireFarmer,
  seasonAnchorIdValidator,
  wrapAsync(getCanonicalPayloadPreviewController)
)

export default anchorRouter
