import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const seasonAnchorIdValidator = validate(
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
