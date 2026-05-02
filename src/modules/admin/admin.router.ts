import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator, requireAdmin } from '~/modules/auth/auth.middleware'
import {
  adminBroadcastBodyValidator,
  adminListUsersQueryValidator,
  adminPatchUserStatusBodyValidator,
  adminUserIdParamValidator
} from './admin.middleware'
import {
  getDashboardSummaryController,
  getUserByIdController,
  listUsersController,
  patchUserStatusController,
  postBroadcastNotificationsController
} from './admin.controller'

const adminRouter = Router()

adminRouter.use(accessTokenValidator)
adminRouter.use(requireAdmin)

adminRouter.get('/dashboard/summary', wrapAsync(getDashboardSummaryController))

adminRouter.get('/users', adminListUsersQueryValidator, wrapAsync(listUsersController))
adminRouter.get(
  '/users/:userId',
  adminUserIdParamValidator,
  wrapAsync(getUserByIdController)
)
adminRouter.patch(
  '/users/:userId/status',
  adminUserIdParamValidator,
  adminPatchUserStatusBodyValidator,
  wrapAsync(patchUserStatusController)
)

adminRouter.post(
  '/notifications/broadcast',
  adminBroadcastBodyValidator,
  wrapAsync(postBroadcastNotificationsController)
)

export default adminRouter
