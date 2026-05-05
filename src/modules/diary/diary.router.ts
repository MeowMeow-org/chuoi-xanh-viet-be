import { Router } from 'express'
import {
  accessTokenValidator,
  requireFarmer,
  requireFarmerOrCooperativeOrAdmin
} from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  addDiaryAttachmentController,
  createDiaryController,
  deleteDiaryAttachmentController,
  deleteDiaryController,
  getDiariesController,
  getDiaryDetailController,
  scanDiaryController,
  updateDiaryController
} from './diary.controller'
import {
  addDiaryAttachmentValidator,
  createDiaryValidator,
  diaryAttachmentParamsValidator,
  diaryIdValidator,
  getDiariesQueryValidator,
  scanSeasonIdValidator,
  updateDiaryValidator
} from './diary.middleware'

const diaryRouter = Router()

/**
 * @desc Create diary entry
 * @route POST /diary/
 * @access private (farmer)
 */
diaryRouter.post(
  '/',
  accessTokenValidator,
  requireFarmer,
  createDiaryValidator,
  wrapAsync(createDiaryController)
)

/**
 * @desc Get diary entries with pagination/filter
 * @route GET /diary/
 * @access private (farmer)
 */
diaryRouter.get(
  '/',
  accessTokenValidator,
  requireFarmer,
  getDiariesQueryValidator,
  wrapAsync(getDiariesController)
)

/**
 * @desc AI scan all diary entries of a season for violations
 * @route POST /diary/scan/:season_id
 * @access private (farmer, cooperative, admin)
 */
diaryRouter.post(
  '/scan/:season_id',
  accessTokenValidator,
  requireFarmerOrCooperativeOrAdmin,
  scanSeasonIdValidator,
  wrapAsync(scanDiaryController)
)

/**
 * @desc Add attachment (e.g. image URL after upload to storage)
 * @route POST /diary/:diary_id/attachments
 * @access private (farmer)
 */
diaryRouter.post(
  '/:diary_id/attachments',
  accessTokenValidator,
  requireFarmer,
  diaryIdValidator,
  addDiaryAttachmentValidator,
  wrapAsync(addDiaryAttachmentController)
)

/**
 * @desc Delete diary attachment
 * @route DELETE /diary/:diary_id/attachments/:attachment_id
 * @access private (farmer)
 */
diaryRouter.delete(
  '/:diary_id/attachments/:attachment_id',
  accessTokenValidator,
  requireFarmer,
  diaryAttachmentParamsValidator,
  wrapAsync(deleteDiaryAttachmentController)
)

/**
 * @desc Get diary entry detail
 * @route GET /diary/:diary_id
 * @access private (farmer)
 */
diaryRouter.get(
  '/:diary_id',
  accessTokenValidator,
  requireFarmer,
  diaryIdValidator,
  wrapAsync(getDiaryDetailController)
)

/**
 * @desc Update diary entry
 * @route PATCH /diary/:diary_id
 * @access private (farmer)
 */
diaryRouter.patch(
  '/:diary_id',
  accessTokenValidator,
  requireFarmer,
  diaryIdValidator,
  updateDiaryValidator,
  wrapAsync(updateDiaryController)
)

/**
 * @desc Delete diary entry
 * @route DELETE /diary/:diary_id
 * @access private (farmer)
 */
diaryRouter.delete(
  '/:diary_id',
  accessTokenValidator,
  requireFarmer,
  diaryIdValidator,
  wrapAsync(deleteDiaryController)
)

export default diaryRouter
