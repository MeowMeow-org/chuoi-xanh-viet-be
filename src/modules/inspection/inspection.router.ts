import { Router } from 'express'
import { accessTokenValidator, requireCooperative } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createInspectionController,
  deleteInspectionController,
  listInspectionsController
} from './inspection.controller'
import {
  createInspectionValidator,
  inspectionIdValidator,
  listInspectionsValidator
} from './inspection.middleware'

const inspectionRouter = Router()

/**
 * @desc Create inspection on a season (as a diary_entry with event_type=inspection)
 * @route POST /inspection/
 * @access private (cooperative, must be approved member of farm)
 */
inspectionRouter.post(
  '/',
  accessTokenValidator,
  requireCooperative,
  createInspectionValidator,
  wrapAsync(createInspectionController)
)

/**
 * @desc List inspections of a season (cooperative/farmer owner/admin)
 * @route GET /inspection?seasonId=
 * @access private (any logged-in user with access to the season)
 */
inspectionRouter.get(
  '/',
  accessTokenValidator,
  listInspectionsValidator,
  wrapAsync(listInspectionsController)
)

/**
 * @desc Delete an inspection (only by the inspector who created it, and season not anchored)
 * @route DELETE /inspection/:inspection_id
 * @access private (cooperative)
 */
inspectionRouter.delete(
  '/:inspection_id',
  accessTokenValidator,
  requireCooperative,
  inspectionIdValidator,
  wrapAsync(deleteInspectionController)
)

export default inspectionRouter
