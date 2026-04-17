import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

const VERDICTS = ['pass', 'fail', 'needs_work']

export const createInspectionValidator = validate(
  checkSchema(
    {
      seasonId: {
        notEmpty: true,
        isUUID: true,
        errorMessage: 'seasonId must be a valid UUID'
      },
      verdict: {
        notEmpty: true,
        isIn: { options: [VERDICTS] },
        errorMessage: `verdict must be one of: ${VERDICTS.join(', ')}`
      },
      summary: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 2000 } },
        errorMessage: 'summary must be a string (max 2000 chars)'
      },
      eventDate: {
        optional: true,
        isISO8601: true,
        errorMessage: 'eventDate must be ISO8601 date'
      },
      attachments: {
        optional: true,
        isArray: { options: { max: 10 } },
        errorMessage: 'attachments must be an array (max 10)'
      },
      'attachments.*.fileUrl': {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 4096 } },
        errorMessage: 'attachment fileUrl must be a non-empty string'
      },
      'attachments.*.objectKey': {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 2048 } },
        errorMessage: 'attachment objectKey must be a non-empty string'
      },
      'attachments.*.mimeType': {
        optional: true,
        custom: {
          options: (v: unknown) => v === null || v === undefined || typeof v === 'string'
        }
      },
      'attachments.*.sortOrder': {
        optional: true,
        isInt: { options: { min: 0 } }
      }
    },
    ['body']
  )
)

export const listInspectionsValidator = validate(
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

export const inspectionIdValidator = validate(
  checkSchema(
    {
      inspection_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'inspection_id must be a valid UUID'
      }
    },
    ['params']
  )
)
