import { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import forumService from './forum.service'
import type {
  CreateForumCommentBody,
  CreateForumPostBody,
  GetForumPostsQuery,
  UpdateForumCommentBody,
  UpdateForumPostBody
} from './forum.request'

export const createForumPostController = async (
  req: Request<ParamsDictionary, unknown, CreateForumPostBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await forumService.createPost(user_id, req.body)
  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_FORUM_POST_SUCCESS,
    data
  })
}

export const getForumPostsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetForumPostsQuery>,
  res: Response
) => {
  const data = await forumService.getPosts(req.query)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_FORUM_POSTS_SUCCESS,
    data
  })
}

export const getForumPostDetailController = async (req: Request<ParamsDictionary>, res: Response) => {
  const decoded = req.decoded_authorization as TokenPayLoad | undefined
  const data = await forumService.getPostById(
    req.params.post_id as string,
    decoded?.user_id ?? '',
    decoded?.role ?? ''
  )
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_FORUM_POST_DETAIL_SUCCESS,
    data
  })
}

export const updateForumPostController = async (
  req: Request<ParamsDictionary, unknown, UpdateForumPostBody>,
  res: Response
) => {
  const { user_id, role } = req.decoded_authorization as TokenPayLoad
  const data = await forumService.updatePost(
    req.params.post_id as string,
    user_id,
    role ?? '',
    req.body
  )
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_FORUM_POST_SUCCESS,
    data
  })
}

export const deleteForumPostController = async (req: Request<ParamsDictionary>, res: Response) => {
  const { user_id, role } = req.decoded_authorization as TokenPayLoad
  await forumService.deletePost(req.params.post_id as string, user_id, role ?? '')
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.DELETE_FORUM_POST_SUCCESS,
    data: null
  })
}

export const createForumCommentController = async (
  req: Request<ParamsDictionary, unknown, CreateForumCommentBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await forumService.createComment(req.params.post_id as string, user_id, req.body)
  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_FORUM_COMMENT_SUCCESS,
    data
  })
}

export const getForumCommentsController = async (
  req: Request<ParamsDictionary, ParamsDictionary, unknown, GetForumPostsQuery>,
  res: Response
) => {
  const data = await forumService.getComments(req.params.post_id as string, req.query)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_FORUM_COMMENTS_SUCCESS,
    data
  })
}

export const updateForumCommentController = async (
  req: Request<ParamsDictionary, unknown, UpdateForumCommentBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await forumService.updateComment(req.params.comment_id as string, user_id, req.body)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_FORUM_COMMENT_SUCCESS,
    data
  })
}

export const deleteForumCommentController = async (req: Request<ParamsDictionary>, res: Response) => {
  const { user_id, role } = req.decoded_authorization as TokenPayLoad
  await forumService.deleteComment(req.params.comment_id as string, user_id, role ?? '')
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.DELETE_FORUM_COMMENT_SUCCESS,
    data: null
  })
}
