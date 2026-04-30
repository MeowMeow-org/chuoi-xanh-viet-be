import { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import chatService from './chat.service'
import { broadcastChatMessage } from './chat.socket'
import type { CreateChatConversationBody, GetChatMessagesQuery, SendChatMessageBody } from './chat.request'

export const createChatConversationController = async (
  req: Request<ParamsDictionary, unknown, CreateChatConversationBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { conversation, created } = await chatService.createOrGetConversation({
    userId: user_id,
    peerUserId: req.body.peerUserId
  })

  return res.sendResponse({
    statusCode: created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
    message: created
      ? USER_MESSAGES.CHAT_CONVERSATION_CREATED
      : USER_MESSAGES.CHAT_CONVERSATION_OPENED,
    data: conversation
  })
}

export const listChatConversationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const items = await chatService.listConversations(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CHAT_CONVERSATIONS_LIST_SUCCESS,
    data: { items }
  })
}

export const listChatMessagesController = async (
  req: Request<{ conversationId: string }, unknown, unknown, GetChatMessagesQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined

  const data = await chatService.listMessages({
    conversationId: req.params.conversationId,
    userId: user_id,
    page,
    limit
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CHAT_MESSAGES_LIST_SUCCESS,
    data
  })
}

export const sendChatMessageRestController = async (
  req: Request<{ conversationId: string }, unknown, SendChatMessageBody>,
  res: Response
) => {
  const { user_id, status } = req.decoded_authorization as TokenPayLoad
  const msg = await chatService.createMessage({
    conversationId: req.params.conversationId,
    senderUserId: user_id,
    senderStatus: status!,
    content: req.body.content
  })

  const participantIds = await chatService.getConversationParticipantIds(req.params.conversationId)
  broadcastChatMessage(req.params.conversationId, msg as unknown as Record<string, unknown>, participantIds)

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CHAT_MESSAGE_SENT,
    data: msg
  })
}

export const markChatConversationReadController = async (
  req: Request<{ conversationId: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await chatService.markConversationRead({
    conversationId: req.params.conversationId,
    userId: user_id
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CHAT_MARK_READ_SUCCESS,
    data: { ok: true }
  })
}
