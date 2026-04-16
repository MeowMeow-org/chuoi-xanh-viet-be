import { checkSchema } from 'express-validator'
import { NextFunction, Request, Response } from 'express'
import { validate } from '~/utils/validation'
import prisma from '~/lib/prisma'
import type { TokenPayLoad } from '../auth/auth.request'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'

export const getFarmsQueryValidator = validate(
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

export const createFarmBodyValidator = validate(
  checkSchema(
    {
      name: {
        isString: true,
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.FARM_NAME_IS_REQUIRED
        },
        isLength: {
          options: { max: 180 },
          errorMessage: 'name must be at most 180 characters'
        }
      },
      area_ha: {
        optional: true,
        isFloat: {
          options: { gt: 0 },
          errorMessage: 'area_ha must be a positive number'
        },
        toFloat: true
      },
      crop_main: {
        optional: true,
        isString: true,
        trim: true,
        isLength: {
          options: { max: 120 },
          errorMessage: 'crop_main must be at most 120 characters'
        }
      },
      province: {
        optional: true,
        isString: true,
        trim: true,
        isLength: {
          options: { max: 100 },
          errorMessage: 'province must be at most 100 characters'
        }
      },
      district: {
        optional: true,
        isString: true,
        trim: true,
        isLength: {
          options: { max: 100 },
          errorMessage: 'district must be at most 100 characters'
        }
      },
      ward: {
        optional: true,
        isString: true,
        trim: true,
        isLength: {
          options: { max: 100 },
          errorMessage: 'ward must be at most 100 characters'
        }
      },
      address: {
        optional: true,
        isString: true,
        trim: true
      },
      latitude: {
        optional: true,
        isFloat: {
          options: { min: -90, max: 90 },
          errorMessage: 'latitude must be between -90 and 90'
        },
        toFloat: true
      },
      longitude: {
        optional: true,
        isFloat: {
          options: { min: -180, max: 180 },
          errorMessage: 'longitude must be between -180 and 180'
        },
        toFloat: true
      },
      in_cooperative: {
        optional: true,
        isBoolean: {
          errorMessage: 'in_cooperative must be a boolean'
        },
        toBoolean: true
      }
    },
    ['body']
  )
)

export const farmerRoleValidator = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayLoad
    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: { role: true }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USER_MESSAGES.USER_NOT_FOUND
      })
    }

    if (user.role !== 'farmer') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.FORBIDDEN_NOT_FARMER
      })
    }

    next()
  } catch (error) {
    next(error)
  }
}
