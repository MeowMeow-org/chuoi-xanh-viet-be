import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

const seasonStatusValues = ['draft', 'ready_to_anchor', 'anchored', 'amended', 'failed']

export const seasonIdValidator = validate(
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

export const createSeasonValidator = validate(
  checkSchema(
    {
      farmId: {
        notEmpty: true,
        isUUID: true,
        errorMessage: 'farmId must be a valid UUID'
      },
      code: {
        notEmpty: true,
        isString: true,
        trim: true,
        errorMessage: 'code is required'
      },
      cropName: {
        notEmpty: true,
        isString: true,
        trim: true,
        errorMessage: 'cropName is required'
      },
      startDate: {
        notEmpty: true,
        isISO8601: true,
        errorMessage: 'startDate must be ISO8601 date'
      },
      harvestStartDate: {
        optional: true,
        isISO8601: true,
        errorMessage: 'harvestStartDate must be ISO8601 date'
      },
      harvestEndDate: {
        optional: true,
        isISO8601: true,
        errorMessage: 'harvestEndDate must be ISO8601 date'
      },
      estimatedYield: {
        optional: true,
        isFloat: true,
        toFloat: true,
        errorMessage: 'estimatedYield must be a number'
      },
      actualYield: {
        optional: true,
        isFloat: true,
        toFloat: true,
        errorMessage: 'actualYield must be a number'
      },
      yieldUnit: {
        optional: true,
        isString: true,
        trim: true,
        errorMessage: 'yieldUnit must be a string'
      }
    },
    ['body']
  )
)

export const updateSeasonValidator = validate(
  checkSchema(
    {
      code: {
        optional: true,
        isString: true,
        trim: true,
        errorMessage: 'code must be a string'
      },
      cropName: {
        optional: true,
        isString: true,
        trim: true,
        errorMessage: 'cropName must be a string'
      },
      startDate: {
        optional: true,
        isISO8601: true,
        errorMessage: 'startDate must be ISO8601 date'
      },
      harvestStartDate: {
        optional: true,
        custom: {
          options: (value) => value === null || !Number.isNaN(Date.parse(value)),
          errorMessage: 'harvestStartDate must be ISO8601 date or null'
        }
      },
      harvestEndDate: {
        optional: true,
        custom: {
          options: (value) => value === null || !Number.isNaN(Date.parse(value)),
          errorMessage: 'harvestEndDate must be ISO8601 date or null'
        }
      },
      estimatedYield: {
        optional: true,
        custom: {
          options: (value) => value === null || !Number.isNaN(Number(value)),
          errorMessage: 'estimatedYield must be a number or null'
        }
      },
      actualYield: {
        optional: true,
        custom: {
          options: (value) => value === null || !Number.isNaN(Number(value)),
          errorMessage: 'actualYield must be a number or null'
        }
      },
      yieldUnit: {
        optional: true,
        custom: {
          options: (value) => value === null || typeof value === 'string',
          errorMessage: 'yieldUnit must be a string or null'
        }
      }
    },
    ['body']
  )
)

export const getSeasonsQueryValidator = validate(
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
      },
      status: {
        optional: true,
        isIn: { options: [seasonStatusValues] },
        errorMessage: `status must be one of: ${seasonStatusValues.join(', ')}`
      },
      farmId: {
        optional: true,
        isUUID: true,
        errorMessage: 'farmId must be a valid UUID'
      }
    },
    ['query']
  )
)
