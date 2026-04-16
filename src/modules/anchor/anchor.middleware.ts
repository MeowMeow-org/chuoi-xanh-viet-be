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

export const seasonCheckpointParamsValidator = validate(
  checkSchema(
    {
      season_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'season_id must be a valid UUID'
      },
      checkpoint_no: {
        in: ['params'],
        notEmpty: true,
        isInt: {
          options: {
            min: 1
          }
        },
        errorMessage: 'checkpoint_no must be a positive integer'
      }
    },
    ['params']
  )
)

export const createCheckpointValidator = validate(
  checkSchema(
    {
      checkpointType: {
        optional: true,
        isString: true,
        trim: true,
        isLength: {
          options: { min: 1, max: 30 }
        },
        errorMessage: 'checkpointType must be a string with length from 1 to 30'
      },
      isFinal: {
        optional: true,
        isBoolean: true,
        errorMessage: 'isFinal must be a boolean'
      },
      payloadRange: {
        optional: true,
        custom: {
          options: (value: unknown) => value === null || typeof value === 'object',
          errorMessage: 'payloadRange must be an object or null'
        }
      }
    },
    ['body']
  )
)
