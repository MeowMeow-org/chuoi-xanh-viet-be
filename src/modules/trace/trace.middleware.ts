import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const traceCodeValidator = validate(
  checkSchema(
    {
      code: {
        in: ['params'],
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 3, max: 200 } },
        errorMessage: 'code must be a non-empty string (3..200 chars)'
      }
    },
    ['params']
  )
)

export const traceSeasonIdValidator = validate(
  checkSchema(
    {
      season_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'season_id must be a valid UUID'
      }
    },
    ['params']
  )
)
