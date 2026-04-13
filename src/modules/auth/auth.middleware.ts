import { Request } from 'express'
import { ParamSchema, checkSchema } from 'express-validator'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { EntityError, ErrorWithStatus } from '~/models/Errors'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import { TokenType } from '~/constants/enums'

const emailSchema: ParamSchema = {
  isEmail: true,
  notEmpty: {
    errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED
  },
  trim: true
}

const passwordSchema: ParamSchema = {
  isString: true,
  notEmpty: {
    errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
  },
  trim: true
}

const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  trim: true,
  custom: {
    options: (value, { req }) => {
      //value là confirm_password
      if (value !== req.body.password) {
        throw new Error(USER_MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH_PASSWORD)
      }
      return true
    }
  }
}

export const loginValidator = validate(
  checkSchema(
    {
      email: emailSchema,
      password: passwordSchema
    },
    ['body']
  )
)

export const registerValidator = validate(
  checkSchema(
    {
      email: emailSchema,
      password: passwordSchema,
      confirm_password: confirmPasswordSchema,
      full_name: {
        isString: true,
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.FULL_NAME_IS_REQUIRED
        }
      },
      phone: {
        isString: true,
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.PHONE_IS_REQUIRED
        }
      }
    },
    ['body']
  )
)

export const logoutValidator = validate(
  checkSchema(
    {
      refreshToken: {
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        }
      }
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        notEmpty: {
          errorMessage: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            const accessToken = value?.split(' ')[1]
            if (!accessToken) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
              })
            }

            try {
              const decoded_authorization = await verifyToken({
                token: accessToken,
                privateKey: process.env.JWT_ACCESS_TOKEN_SECRET as string
              })
              ;(req as Request).decoded_authorization = decoded_authorization
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: capitalize((error as JsonWebTokenError).message)
              })
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refreshToken: {
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            try {
              const decoded_refresh_token = await verifyToken({
                token: value,
                privateKey: process.env.JWT_REFRESH_TOKEN_SECRET as string
              })

              if (decoded_refresh_token.token_type !== TokenType.RefreshToken) {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  message: USER_MESSAGES.REFRESH_TOKEN_IS_INVALID
                })
              }

              ;(req as Request).decoded_refresh_token = decoded_refresh_token
            } catch (error) {
              if (error instanceof ErrorWithStatus) {
                throw error
              }
              if (error instanceof TokenExpiredError) {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  message: USER_MESSAGES.REFRESH_TOKEN_IS_INVALID
                })
              }
            }
          }
        }
      }
    },
    ['body']
  )
)

export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: emailSchema
    },
    ['body']
  )
)

export const verifyForgotPasswordValidator = validate(
  checkSchema(
    {
      forgot_password_token: {
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value là forgot_password_token

            try {
              const decoded_forgot_password_token = await verifyToken({
                token: value,
                privateKey: process.env.JWT_RESET_PASSWORD_TOKEN_SECRET as string
              })

              ;(req as Request).decoded_forgot_password_token = decoded_forgot_password_token
            } catch (error) {
              if (error instanceof TokenExpiredError) {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  message: USER_MESSAGES.VERIFY_FORGOT_PASSWORD_IS_EXPIRED
                })
              } else {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  message: capitalize((error as JsonWebTokenError).message)
                })
              }
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)

export const resetPasswordValidator = validate(
  checkSchema(
    {
      password: passwordSchema,
      confirm_password: confirmPasswordSchema
    },
    ['body']
  )
)
