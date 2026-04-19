import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'
import USER_MESSAGES from '~/constants/messages'

const CERT_TYPES = ['vietgap', 'globalgap', 'organic', 'other'] as const

const dateOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string') return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

const upsertBodySchemaBase = {
  type: {
    isIn: {
      options: [CERT_TYPES],
      errorMessage: USER_MESSAGES.CERT_TYPE_INVALID
    }
  },
  certificate_no: {
    optional: { options: { nullable: true } },
    isString: true,
    trim: true,
    isLength: { options: { max: 120 } }
  },
  issuer: {
    optional: { options: { nullable: true } },
    isString: true,
    trim: true,
    isLength: { options: { max: 240 } }
  },
  issued_at: {
    optional: { options: { nullable: true } },
    custom: {
      options: dateOrNull,
      errorMessage: 'issued_at must be a valid date string'
    }
  },
  expires_at: {
    optional: { options: { nullable: true } },
    custom: {
      options: dateOrNull,
      errorMessage: 'expires_at must be a valid date string'
    }
  },
  file_url: {
    isString: true,
    trim: true,
    notEmpty: { errorMessage: USER_MESSAGES.CERT_FILE_URL_REQUIRED },
    isLength: { options: { max: 2048 } }
  }
}

export const createCoopCertValidator = validate(
  checkSchema(upsertBodySchemaBase, ['body'])
)

export const updateCoopCertValidator = validate(
  checkSchema(
    {
      type: { ...upsertBodySchemaBase.type, optional: true },
      certificate_no: upsertBodySchemaBase.certificate_no,
      issuer: upsertBodySchemaBase.issuer,
      issued_at: upsertBodySchemaBase.issued_at,
      expires_at: upsertBodySchemaBase.expires_at,
      file_url: { ...upsertBodySchemaBase.file_url, optional: true }
    },
    ['body']
  )
)

export const createFarmCertValidator = validate(
  checkSchema(
    {
      farm_id: {
        isUUID: { errorMessage: 'farm_id must be a valid UUID' },
        notEmpty: true
      },
      ...upsertBodySchemaBase
    },
    ['body']
  )
)

export const certIdParamValidator = validate(
  checkSchema(
    {
      certificateId: {
        isUUID: { errorMessage: 'certificateId must be a valid UUID' }
      }
    },
    ['params']
  )
)

export const farmIdParamValidator = validate(
  checkSchema(
    {
      farmId: {
        isUUID: { errorMessage: 'farmId must be a valid UUID' }
      }
    },
    ['params']
  )
)

export const scopeAddBodyValidator = validate(
  checkSchema(
    {
      farm_id: {
        isUUID: { errorMessage: 'farm_id must be a valid UUID' },
        notEmpty: true
      }
    },
    ['body']
  )
)

export const rejectBodyValidator = validate(
  checkSchema(
    {
      reason: {
        isString: true,
        trim: true,
        notEmpty: { errorMessage: USER_MESSAGES.CERT_REJECT_REASON_REQUIRED },
        isLength: { options: { min: 1, max: 1000 } }
      }
    },
    ['body']
  )
)

export const revokeBodyValidator = validate(
  checkSchema(
    {
      reason: {
        isString: true,
        trim: true,
        notEmpty: { errorMessage: USER_MESSAGES.CERT_REVOKE_REASON_REQUIRED },
        isLength: { options: { min: 1, max: 1000 } }
      }
    },
    ['body']
  )
)

export const listQueryValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: { options: { min: 1, max: 100 } },
        toInt: true
      },
      status: {
        optional: true,
        isString: true
      },
      type: {
        optional: true,
        isIn: { options: [CERT_TYPES] }
      },
      farmId: {
        optional: true,
        isUUID: true
      }
    },
    ['query']
  )
)

/** GET danh sách thừa hưởng / nông hộ đủ điều kiện thêm vào danh sách */
export const scopeBrowseQueryValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: { options: { min: 1, max: 100 } },
        toInt: true
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
