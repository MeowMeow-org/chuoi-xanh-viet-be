import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController
} from './notification.controller'
import { listNotificationsQueryValidator, notificationIdParamValidator } from './notification.middleware'

const notificationRouter = Router()

/**
 * @desc Danh sách thông báo của user đăng nhập (phân trang, lọc chưa đọc)
 * @route GET /notification
 */
notificationRouter.get(
  '/',
  accessTokenValidator,
  listNotificationsQueryValidator,
  wrapAsync(listNotificationsController)
)

/**
 * @desc Đánh dấu tất cả đã đọc
 * @route PATCH /notification/read-all
 */
notificationRouter.patch('/read-all', accessTokenValidator, wrapAsync(markAllNotificationsReadController))

/**
 * @desc Đánh dấu một thông báo đã đọc
 * @route PATCH /notification/:notification_id/read
 */
notificationRouter.patch(
  '/:notification_id/read',
  accessTokenValidator,
  notificationIdParamValidator,
  wrapAsync(markNotificationReadController)
)

export default notificationRouter
