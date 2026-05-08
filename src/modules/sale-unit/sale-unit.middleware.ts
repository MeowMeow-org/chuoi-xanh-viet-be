import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const createSaleUnitValidator = validate(
  checkSchema(
    {
      seasonId: {
        notEmpty: true,
        isUUID: true,
        errorMessage: 'seasonId must be a valid UUID'
      },
      quantity: {
        notEmpty: true,
        isFloat: { options: { gt: 0 } },
        toFloat: true,
        errorMessage: 'quantity must be a positive number'
      },
      unit: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 20 } }
      },
      shortCode: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 3, max: 30 } },
        matches: {
          options: /^[A-Z0-9-]+$/,
          errorMessage: 'shortCode may only contain uppercase letters, digits, and hyphens'
        }
      }
    },
    ['body']
  )
)

export const listSaleUnitsValidator = validate(
  checkSchema(
    {
      seasonId: {
        notEmpty: true,
        isUUID: true,
        errorMessage: 'seasonId must be a valid UUID'
      }
    },
    ['query']
  )
)

export const saleUnitIdValidator = validate(
  checkSchema(
    {
      sale_unit_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'sale_unit_id must be a valid UUID'
      }
    },
    ['params']
  )
)
