import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import {
  createCheckpointAnchorController,
  getCanonicalPayloadPreviewController,
  listCheckpointAnchorsController,
  verifyCheckpointAnchorController
} from './anchor.controller'
import { createCheckpointValidator, seasonAnchorIdValidator, seasonCheckpointParamsValidator } from './anchor.middleware'

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

/**
 * @desc Create new checkpoint anchor for one season
 * @route POST /anchor/season/:season_id/checkpoints
 * @access private (farmer)
 */
anchorRouter.post(
  '/season/:season_id/checkpoints',
  accessTokenValidator,
  requireFarmer,
  seasonAnchorIdValidator,
  createCheckpointValidator,
  wrapAsync(createCheckpointAnchorController)
)

/**
 * @desc List checkpoint anchors of one season
 * @route GET /anchor/season/:season_id/checkpoints
 * @access private (farmer)
 */
anchorRouter.get(
  '/season/:season_id/checkpoints',
  accessTokenValidator,
  requireFarmer,
  seasonAnchorIdValidator,
  wrapAsync(listCheckpointAnchorsController)
)

/**
 * @desc Verify one checkpoint anchor hash by current canonical payload
 * @route GET /anchor/season/:season_id/checkpoints/:checkpoint_no/verify
 * @access private (farmer)
 */
anchorRouter.get(
  '/season/:season_id/checkpoints/:checkpoint_no/verify',
  accessTokenValidator,
  requireFarmer,
  seasonCheckpointParamsValidator,
  wrapAsync(verifyCheckpointAnchorController)
)

export default anchorRouter
