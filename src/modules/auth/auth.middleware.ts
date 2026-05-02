import type { user_role } from '@prisma/client'
import { NextFunction, Request, Response } from 'express'
import { ParamSchema, checkSchema } from 'express-validator'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import prisma from '~/lib/prisma'
import { EntityError, ErrorWithStatus } from '~/models/Errors'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import { TokenType } from '~/constants/enums'
import type { TokenPayLoad } from './auth.request'

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
      },
      role: {
        notEmpty: {
          errorMessage: USER_MESSAGES.REGISTER_ROLE_REQUIRED
        },
        isIn: {
          options: [['consumer', 'farmer']],
          errorMessage: USER_MESSAGES.REGISTER_ROLE_INVALID
        }
      }
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      authorization: {
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
              const payload = decoded_authorization as TokenPayLoad
              if (payload.token_type !== TokenType.AccessToken) {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
                })
              }
              const row = await prisma.users.findUnique({
                where: { id: payload.user_id },
                select: { status: true }
              })
              if (row == null) {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.UNAUTHORIZED,
                  message: USER_MESSAGES.USER_NOT_FOUND
                })
              }
              if (row.status === 'suspended') {
                throw new ErrorWithStatus({
                  status: HTTP_STATUS.FORBIDDEN,
                  message: USER_MESSAGES.ACCOUNT_SUSPENDED
                })
              }
              ;(req as Request).decoded_authorization = decoded_authorization
            } catch (error) {
              if (error instanceof ErrorWithStatus) {
                throw error
              }
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
    ['headers']
  )
)

/**
 * Optional auth: nếu client có gửi Authorization hợp lệ thì gắn `decoded_authorization`,
 * nếu không có / token hỏng thì coi như guest và tiếp tục (KHÔNG trả 401).
 * Dùng cho các endpoint public-read nhưng muốn personalize khi đã đăng nhập.
 */
export const optionalAccessTokenValidator = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const accessToken = authHeader?.split(' ')[1]

  if (!accessToken) {
    return next()
  }

  try {
    const decoded_authorization = await verifyToken({
      token: accessToken,
      privateKey: process.env.JWT_ACCESS_TOKEN_SECRET as string
    })
    req.decoded_authorization = decoded_authorization
  } catch {
    // token hết hạn/hỏng — bỏ qua, request vẫn được xử lý như guest
  }

  return next()
}

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
              return true
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
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: USER_MESSAGES.REFRESH_TOKEN_IS_INVALID
              })
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

const loadCurrentUser = async (req: Request) => {
  if (req.current_user) {
    return req.current_user
  }

  const decoded = req.decoded_authorization
  if (!decoded?.user_id) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
    })
  }

  if (decoded.role && decoded.status) {
    const userFromToken = {
      id: decoded.user_id,
      role: decoded.role,
      status: decoded.status
    }
    req.current_user = userFromToken
    return userFromToken
  }

  const user = await prisma.users.findUnique({
    where: { id: decoded.user_id },
    select: {
      id: true,
      role: true,
      status: true
    }
  })

  if (user == null) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED,
      message: USER_MESSAGES.USER_NOT_FOUND
    })
  }

  req.current_user = user
  return user
}

const requireRoles = (roles: user_role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = await loadCurrentUser(req)
      if (!roles.includes(currentUser.role)) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: 'You do not have permission to access this resource'
        })
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

const patchMeFullNameSchema: ParamSchema = {
  optional: true,
  isString: true,
  trim: true,
  isLength: {
    options: { min: 1, max: 120 },
    errorMessage: 'fullName must be 1–120 characters'
  }
}

const patchMePhoneSchema: ParamSchema = {
  optional: true,
  isString: true,
  trim: true,
  isLength: {
    options: { min: 8, max: 20 },
    errorMessage: 'phone must be 8–20 characters'
  }
}

export const patchMeValidator = validate(
  checkSchema(
    {
      avatarUrl: {
        optional: true,
        custom: {
          options: (value: unknown) => {
            if (value === null || value === undefined) return true
            if (typeof value !== 'string') return false
            return value.trim().length <= 2048
          },
          errorMessage: USER_MESSAGES.AVATAR_URL_INVALID
        }
      },
      fullName: patchMeFullNameSchema,
      phone: patchMePhoneSchema,
      zaloUserId: {
        optional: true,
        custom: {
          options: (value: unknown) => {
            if (value === undefined || value === null) return true
            if (typeof value !== 'string') return false
            const t = value.trim()
            if (t === '') return true
            return /^\d{1,50}$/.test(t)
          },
          errorMessage: USER_MESSAGES.ZALO_USER_ID_INVALID
        }
      }
    },
    ['body']
  )
)

const changePasswordConfirmSchema: ParamSchema = {
  notEmpty: {
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  trim: true,
  custom: {
    options: (value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error(USER_MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH_PASSWORD)
      }
      return true
    }
  }
}

export const changePasswordValidator = validate(
  checkSchema(
    {
      currentPassword: passwordSchema,
      newPassword: passwordSchema,
      confirm_password: changePasswordConfirmSchema
    },
    ['body']
  )
)

export const requireConsumer = requireRoles(['consumer'])
export const requireFarmer = requireRoles(['farmer'])
export const requireCooperative = requireRoles(['cooperative'])
export const requireAdmin = requireRoles(['admin'])
export const requireCooperativeOrAdmin = requireRoles(['cooperative', 'admin'])
export const requireFarmerOrCooperativeOrAdmin = requireRoles(['farmer', 'cooperative', 'admin'])
export const requireForumParticipant = requireRoles(['consumer', 'farmer', 'cooperative', 'admin'])
