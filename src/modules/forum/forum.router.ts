import { Router } from 'express'
import { accessTokenValidator, optionalAccessTokenValidator, requireForumParticipant } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createForumCommentController,
  createForumPostController,
  deleteForumCommentController,
  deleteForumPostController,
  getForumCommentsController,
  getForumPostDetailController,
  getForumPostsController,
  updateForumCommentController,
  updateForumPostController
} from './forum.controller'
import {
  createForumCommentValidator,
  createForumPostValidator,
  forumCommentIdValidator,
  forumPostIdValidator,
  getForumCommentsQueryValidator,
  getForumPostsQueryValidator,
  updateForumCommentValidator,
  updateForumPostValidator
} from './forum.middleware'

const forumRouter = Router()

/**
 * @desc Danh sách bài viết — public read.
 * Guest xem được; nếu có token hợp lệ thì controller vẫn nhận `decoded_authorization` để personalize.
 */
forumRouter.get('/posts', optionalAccessTokenValidator, getForumPostsQueryValidator, wrapAsync(getForumPostsController))

/**
 * @desc Tạo bài — cần login + role thuộc forum participant.
 */
forumRouter.post(
  '/posts',
  accessTokenValidator,
  requireForumParticipant,
  createForumPostValidator,
  wrapAsync(createForumPostController)
)

/**
 * @desc Danh sách comment của 1 bài — public read.
 */
forumRouter.get(
  '/posts/:post_id/comments',
  optionalAccessTokenValidator,
  forumPostIdValidator,
  getForumCommentsQueryValidator,
  wrapAsync(getForumCommentsController)
)

/**
 * @desc Tạo comment — cần login + role thuộc forum participant.
 */
forumRouter.post(
  '/posts/:post_id/comments',
  accessTokenValidator,
  requireForumParticipant,
  forumPostIdValidator,
  createForumCommentValidator,
  wrapAsync(createForumCommentController)
)

/**
 * @desc Chi tiết 1 bài — public read. Token optional để author/admin xem bài hidden.
 */
forumRouter.get(
  '/posts/:post_id',
  optionalAccessTokenValidator,
  forumPostIdValidator,
  wrapAsync(getForumPostDetailController)
)

forumRouter.patch(
  '/posts/:post_id',
  accessTokenValidator,
  requireForumParticipant,
  forumPostIdValidator,
  updateForumPostValidator,
  wrapAsync(updateForumPostController)
)

forumRouter.delete(
  '/posts/:post_id',
  accessTokenValidator,
  requireForumParticipant,
  forumPostIdValidator,
  wrapAsync(deleteForumPostController)
)

forumRouter.patch(
  '/comments/:comment_id',
  accessTokenValidator,
  requireForumParticipant,
  forumCommentIdValidator,
  updateForumCommentValidator,
  wrapAsync(updateForumCommentController)
)

forumRouter.delete(
  '/comments/:comment_id',
  accessTokenValidator,
  requireForumParticipant,
  forumCommentIdValidator,
  wrapAsync(deleteForumCommentController)
)

export default forumRouter
