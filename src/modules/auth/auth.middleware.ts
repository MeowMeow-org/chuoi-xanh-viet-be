import { checkSchema } from 'express-validator'
import USER_MESSAGES from '~/constants/messages'
import { validate } from '~/utils/validation'

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED
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
