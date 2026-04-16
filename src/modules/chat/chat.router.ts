import { Router } from 'express'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  createChatConversationController,
  listChatConversationsController,
  listChatMessagesController,
  sendChatMessageRestController
} from './chat.controller'
import {
  chatConversationIdValidator,
  createChatConversationValidator,
  getChatMessagesQueryValidator,
  sendChatMessageValidator
} from './chat.middleware'

const chatRouter = Router()

chatRouter.post(
  '/conversations',
  accessTokenValidator,
  createChatConversationValidator,
  wrapAsync(createChatConversationController)
)

chatRouter.get('/conversations', accessTokenValidator, wrapAsync(listChatConversationsController))

chatRouter.get(
  '/conversations/:conversationId/messages',
  accessTokenValidator,
  chatConversationIdValidator,
  getChatMessagesQueryValidator,
  wrapAsync(listChatMessagesController)
)

chatRouter.post(
  '/conversations/:conversationId/messages',
  accessTokenValidator,
  chatConversationIdValidator,
  sendChatMessageValidator,
  wrapAsync(sendChatMessageRestController)
)

export default chatRouter
