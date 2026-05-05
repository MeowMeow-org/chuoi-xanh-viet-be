import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'
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
      province_code: {
        optional: { options: { nullable: true } },
        isInt: {
          options: { gt: 0 },
          errorMessage: 'province_code must be a positive integer'
        },
        toInt: true
      },
      district_code: {
        optional: { options: { nullable: true } },
        isInt: {
          options: { gt: 0 },
          errorMessage: 'district_code must be a positive integer'
        },
        toInt: true
      },
      ward_code: {
        optional: { options: { nullable: true } },
        isInt: {
          options: { gt: 0 },
          errorMessage: 'ward_code must be a positive integer'
        },
        toInt: true
      },
      address: {
        isString: true,
        trim: true,
        notEmpty: {
          errorMessage: USER_MESSAGES.FARM_ADDRESS_DETAIL_IS_REQUIRED
        },
        isLength: {
          options: { max: 1000 },
          errorMessage: 'address must be at most 1000 characters'
        }
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

export const updateFarmBodyValidator = validate(
  checkSchema(
    {
      name: {
        optional: true,
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
      province_code: {
        optional: { options: { nullable: true } },
        isInt: {
          options: { gt: 0 },
          errorMessage: 'province_code must be a positive integer'
        },
        toInt: true
      },
      district_code: {
        optional: { options: { nullable: true } },
        isInt: {
          options: { gt: 0 },
          errorMessage: 'district_code must be a positive integer'
        },
        toInt: true
      },
      ward_code: {
        optional: { options: { nullable: true } },
        isInt: {
          options: { gt: 0 },
          errorMessage: 'ward_code must be a positive integer'
        },
        toInt: true
      },
      address: {
        custom: {
          options: (value: unknown) => {
            if (value === undefined) return true
            if (typeof value !== 'string') return false
            const t = value.trim()
            if (t.length === 0) return false
            if (t.length > 1000) return false
            return true
          },
          errorMessage: USER_MESSAGES.FARM_ADDRESS_DETAIL_IS_REQUIRED
        }
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

export const farmIdParamValidator = validate(
  checkSchema(
    {
      farm_id: {
        isUUID: {
          errorMessage: 'farm_id must be a valid UUID'
        }
      }
    },
    ['params']
  )
)
