import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const listNotificationsQueryValidator = validate(
  checkSchema(
    {
      page: {
        in: ['query'],
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true
      },
      limit: {
        in: ['query'],
        optional: true,
        isInt: { options: { min: 1, max: 100 } },
        toInt: true
      },
      unread_only: {
        in: ['query'],
        optional: true,
        isIn: {
          options: [['0', '1', 'true', 'false']],
          errorMessage: 'unread_only must be 0, 1, true, or false'
        }
      }
    },
    ['query']
  )
)

export const notificationIdParamValidator = validate(
  checkSchema(
    {
      notification_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'notification_id must be a valid UUID'
      }
    },
    ['params']
  )
)
