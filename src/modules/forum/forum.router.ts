import { Router } from 'express'
import { accessTokenValidator, requireForumParticipant } from '../auth/auth.middleware'
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

forumRouter.get(
  '/posts',
  accessTokenValidator,
  requireForumParticipant,
  getForumPostsQueryValidator,
  wrapAsync(getForumPostsController)
)

forumRouter.post(
  '/posts',
  accessTokenValidator,
  requireForumParticipant,
  createForumPostValidator,
  wrapAsync(createForumPostController)
)

forumRouter.get(
  '/posts/:post_id/comments',
  accessTokenValidator,
  requireForumParticipant,
  forumPostIdValidator,
  getForumCommentsQueryValidator,
  wrapAsync(getForumCommentsController)
)

forumRouter.post(
  '/posts/:post_id/comments',
  accessTokenValidator,
  requireForumParticipant,
  forumPostIdValidator,
  createForumCommentValidator,
  wrapAsync(createForumCommentController)
)

forumRouter.get(
  '/posts/:post_id',
  accessTokenValidator,
  requireForumParticipant,
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
