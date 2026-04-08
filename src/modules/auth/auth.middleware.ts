import { checkSchema } from 'express-validator'
import USER_MESSAGES from '~/constants/messages'
import { validate } from '~/utils/validation'

export const loginValidator = validate(
  checkSchema(
    {
      fullName: {
        notEmpty: {
          errorMessage: USER_MESSAGES.FULL_NAME_IS_REQUIRED
        }
      },
      password: {
        isString: true,
        errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
      }
    },
    ['body']
  )
)
