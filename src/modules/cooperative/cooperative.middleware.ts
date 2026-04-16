import { NextFunction, Request, Response } from 'express'
import { checkSchema, type Meta } from 'express-validator'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { validate } from '~/utils/validation'
import type { TokenPayLoad } from '../auth/auth.request'

const emailSchema = {
  isEmail: true,
  notEmpty: {
    errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED
  },
  trim: true
}

const passwordSchema = {
  isString: true,
  notEmpty: {
    errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
  },
  trim: true
}

const confirmPasswordSchema = {
  notEmpty: {
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  trim: true,
  custom: {
    options: (value: string, meta: Meta) => {
      if (value !== meta.req.body.password) {
        throw new Error(USER_MESSAGES.CONFIRM_PASSWORD_DOES_NOT_MATCH_PASSWORD)
      }
      return true
    }
  }
}

export const getHtxListQueryValidator = validate(
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
      },
      searchTerm: {
        optional: true,
        isString: true,
        trim: true
      }
    },
    ['query']
  )
)

export const registerFarmerApplicantValidator = validate(
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
      cooperative_user_id: {
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.COOPERATIVE_USER_ID_IS_REQUIRED
        },
        isUUID: {
          errorMessage: 'cooperative_user_id must be a valid UUID'
        }
      },
      farm_name: {
        isString: true,
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.FARM_NAME_IS_REQUIRED
        },
        isLength: {
          options: { max: 180 },
          errorMessage: 'farm_name must be at most 180 characters'
        }
      }
    },
    ['body']
  )
)

export const membershipIdParamValidator = validate(
  checkSchema(
    {
      membershipId: {
        isUUID: {
          errorMessage: 'membershipId must be a valid UUID'
        }
      }
    },
    ['params']
  )
)

export const rejectMembershipBodyValidator = validate(
  checkSchema(
    {
      note: {
        optional: true,
        isString: true,
        trim: true
      }
    },
    ['body']
  )
)

export const cooperativeRoleValidator = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayLoad
    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: { role: true, status: true }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USER_MESSAGES.USER_NOT_FOUND
      })
    }

    if (user.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FORBIDDEN_NOT_COOPERATIVE
      })
    }

    if (user.role !== 'cooperative') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FORBIDDEN_NOT_COOPERATIVE
      })
    }

    next()
  } catch (e) {
    next(e)
  }
}
