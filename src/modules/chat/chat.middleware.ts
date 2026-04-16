import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const createChatConversationValidator = validate(
  checkSchema(
    {
      peerUserId: {
        in: ['body'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'peerUserId must be a valid UUID'
      }
    },
    ['body']
  )
)

export const chatConversationIdValidator = validate(
  checkSchema(
    {
      conversationId: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'conversationId must be a valid UUID'
      }
    },
    ['params']
  )
)

export const sendChatMessageValidator = validate(
  checkSchema(
    {
      content: {
        in: ['body'],
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 8000 } },
        errorMessage: 'content must be a string from 1 to 8000 characters'
      }
    },
    ['body']
  )
)

export const getChatMessagesQueryValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true,
        errorMessage: 'page must be a positive integer'
      },
      limit: {
        optional: true,
        isInt: { options: { min: 1, max: 100 } },
        toInt: true,
        errorMessage: 'limit must be between 1 and 100'
      }
    },
    ['query']
  )
)
