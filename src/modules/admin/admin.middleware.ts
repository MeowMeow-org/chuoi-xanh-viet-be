import type { ParamSchema } from 'express-validator'
import { checkSchema } from 'express-validator'
import USER_MESSAGES from '~/constants/messages'
import { validate } from '~/utils/validation'

const userRoleValues = ['consumer', 'farmer', 'cooperative', 'admin'] as const
const accountStatusValues = ['active', 'pending', 'suspended'] as const

export const adminListUsersQueryValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: { options: { min: 1, max: 100 } },
        toInt: true
      },
      q: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 120 } }
      },
      role: {
        optional: true,
        isIn: { options: [userRoleValues] }
      },
      status: {
        optional: true,
        isIn: { options: [accountStatusValues] }
      }
    },
    ['query']
  )
)

const userIdParam: ParamSchema = {
  isUUID: true,
  errorMessage: USER_MESSAGES.USER_NOT_FOUND
}

export const adminUserIdParamValidator = validate(
  checkSchema(
    {
      userId: userIdParam
    },
    ['params']
  )
)

export const adminPatchUserStatusBodyValidator = validate(
  checkSchema(
    {
      status: {
        isIn: {
          options: [['active', 'suspended']],
          errorMessage: USER_MESSAGES.ADMIN_USER_STATUS_INVALID
        }
      }
    },
    ['body']
  )
)

const broadcastAudience = ['all', 'consumers', 'farmers', 'cooperatives'] as const

export const adminBroadcastBodyValidator = validate(
  checkSchema(
    {
      title: {
        isString: true,
        trim: true,
        notEmpty: true,
        isLength: { options: { min: 1, max: 240 } }
      },
      body: {
        isString: true,
        notEmpty: true,
        isLength: { options: { max: 8000 } }
      },
      audience: {
        isIn: {
          options: [broadcastAudience],
          errorMessage: USER_MESSAGES.ADMIN_BROADCAST_AUDIENCE_INVALID
        }
      },
      linkPath: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 512 } }
      }
    },
    ['body']
  )
)
