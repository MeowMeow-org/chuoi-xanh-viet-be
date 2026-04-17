import { Router } from 'express'
import { accessTokenValidator, requireForumParticipant } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { getSeasonTraceController, resolveTraceController, verifyTraceController } from './trace.controller'
import { traceCodeValidator, traceSeasonIdValidator } from './trace.middleware'

const traceRouter = Router()

/**
 * @desc Resolve a QR short_code / qr_token → sale_unit + season. Log trace_scan.
 * @route GET /trace/resolve/:code
 * @access private (any authenticated user: consumer/farmer/cooperative/admin — guest bị chặn)
 */
traceRouter.get(
  '/resolve/:code',
  accessTokenValidator,
  requireForumParticipant,
  traceCodeValidator,
  wrapAsync(resolveTraceController)
)

/**
 * @desc Get full trace detail of a season (farm, owner, cooperative, diaries, inspections, anchors)
 * @route GET /trace/season/:season_id
 * @access private (any authenticated user)
 */
traceRouter.get(
  '/season/:season_id',
  accessTokenValidator,
  requireForumParticipant,
  traceSeasonIdValidator,
  wrapAsync(getSeasonTraceController)
)

/**
 * @desc Verify integrity: rehash current DB data and compare with latest anchor data_hash
 * @route GET /trace/verify/:season_id
 * @access private (any authenticated user)
 */
traceRouter.get(
  '/verify/:season_id',
  accessTokenValidator,
  requireForumParticipant,
  traceSeasonIdValidator,
  wrapAsync(verifyTraceController)
)

export default traceRouter
