import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

const eventTypeValues = [
  'land_prep',
  'sowing',
  'fertilizing',
  'pesticide',
  'irrigation',
  'harvesting',
  'packing',
  'other'
]

export const diaryIdValidator = validate(
  checkSchema(
    {
      diary_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'diary_id must be a valid UUID'
      }
    },
    ['params']
  )
)

export const diaryAttachmentParamsValidator = validate(
  checkSchema(
    {
      diary_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'diary_id must be a valid UUID'
      },
      attachment_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'attachment_id must be a valid UUID'
      }
    },
    ['params']
  )
)

export const addDiaryAttachmentValidator = validate(
  checkSchema(
    {
      fileUrl: {
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: {
          options: { min: 1, max: 4096 }
        },
        errorMessage: 'fileUrl must be a non-empty string (max 4096 chars)'
      },
      mimeType: {
        optional: true,
        custom: {
          options: (value: unknown) => value === null || value === undefined || typeof value === 'string',
          errorMessage: 'mimeType must be a string or null'
        }
      },
      sortOrder: {
        optional: true,
        isInt: { options: { min: 0 } },
        errorMessage: 'sortOrder must be a non-negative integer'
      },
      meta: {
        optional: true,
        custom: {
          options: (value: unknown) => value === null || typeof value === 'object',
          errorMessage: 'meta must be an object or null'
        }
      }
    },
    ['body']
  )
)

export const createDiaryValidator = validate(
  checkSchema(
    {
      seasonId: {
        notEmpty: true,
        isUUID: true,
        errorMessage: 'seasonId must be a valid UUID'
      },
      farmId: {
        notEmpty: true,
        isUUID: true,
        errorMessage: 'farmId must be a valid UUID'
      },
      eventType: {
        notEmpty: true,
        isIn: { options: [eventTypeValues] },
        errorMessage: `eventType must be one of: ${eventTypeValues.join(', ')}`
      },
      eventDate: {
        notEmpty: true,
        isISO8601: true,
        errorMessage: 'eventDate must be ISO8601 date'
      },
      description: {
        optional: true,
        isString: true,
        trim: true,
        errorMessage: 'description must be a string'
      },
      extraData: {
        optional: true,
        custom: {
          options: (value) => value === null || typeof value === 'object',
          errorMessage: 'extraData must be an object or null'
        }
      }
    },
    ['body']
  )
)

export const updateDiaryValidator = validate(
  checkSchema(
    {
      eventType: {
        optional: true,
        isIn: { options: [eventTypeValues] },
        errorMessage: `eventType must be one of: ${eventTypeValues.join(', ')}`
      },
      eventDate: {
        optional: true,
        isISO8601: true,
        errorMessage: 'eventDate must be ISO8601 date'
      },
      description: {
        optional: true,
        custom: {
          options: (value) => value === null || typeof value === 'string',
          errorMessage: 'description must be a string or null'
        }
      },
      extraData: {
        optional: true,
        custom: {
          options: (value) => value === null || typeof value === 'object',
          errorMessage: 'extraData must be an object or null'
        }
      }
    },
    ['body']
  )
)

export const getDiariesQueryValidator = validate(
  checkSchema(
    {
      seasonId: {
        optional: true,
        isUUID: true,
        errorMessage: 'seasonId must be a valid UUID'
      },
      farmId: {
        optional: true,
        isUUID: true,
        errorMessage: 'farmId must be a valid UUID'
      },
      eventType: {
        optional: true,
        isIn: { options: [eventTypeValues] },
        errorMessage: `eventType must be one of: ${eventTypeValues.join(', ')}`
      },
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
      }
    },
    ['query']
  )
)
