import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const suggestShopQueryValidator = validate(
  checkSchema(
    {
      farm_id: {
        isUUID: { errorMessage: 'farm_id must be a valid UUID' }
      }
    },
    ['query']
  )
)

export const createShopBodyValidator = validate(
  checkSchema(
    {
      farm_id: {
        isUUID: { errorMessage: 'farm_id must be a valid UUID' }
      },
      name: {
        isString: true,
        trim: true,
        notEmpty: { errorMessage: 'Shop name is required' },
        isLength: { options: { max: 180 }, errorMessage: 'name must be at most 180 characters' }
      },
      description: {
        optional: true,
        isString: true,
        trim: true
      },
      avatar_url: {
        optional: { options: { nullable: true } },
        custom: {
          options: (value: unknown) =>
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim().length <= 2048),
          errorMessage: 'avatar_url must be a string at most 2048 characters or null'
        }
      }
    },
    ['body']
  )
)

export const updateShopBodyValidator = validate(
  checkSchema(
    {
      name: {
        optional: true,
        isString: true,
        trim: true,
        notEmpty: { errorMessage: 'Shop name cannot be empty' },
        isLength: { options: { max: 180 }, errorMessage: 'name must be at most 180 characters' }
      },
      description: {
        optional: true,
        isString: true,
        trim: true
      },
      avatar_url: {
        optional: { options: { nullable: true } },
        custom: {
          options: (value: unknown) =>
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim().length <= 2048),
          errorMessage: 'avatar_url must be a string at most 2048 characters or null'
        }
      },
      status: {
        optional: true,
        isString: true,
        isIn: {
          options: [['open', 'closed', 'suspended']],
          errorMessage: 'status must be one of: open, closed, suspended'
        }
      }
    },
    ['body']
  )
)

export const shopIdParamValidator = validate(
  checkSchema(
    {
      shop_id: {
        isUUID: { errorMessage: 'shop_id must be a valid UUID' }
      }
    },
    ['params']
  )
)

export const getShopsQueryValidator = validate(
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

export const getPublicProductsQueryValidator = validate(
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
      searchTerm: { optional: true, isString: true, trim: true },
      province: { optional: true, isString: true, trim: true },
      shopId: {
        optional: true,
        isUUID: { errorMessage: 'shopId must be a valid UUID' }
      }
    },
    ['query']
  )
)

export const productIdParamValidator = validate(
  checkSchema(
    {
      product_id: {
        isUUID: { errorMessage: 'product_id must be a valid UUID' }
      }
    },
    ['params']
  )
)

export const addProductBodyValidator = validate(
  checkSchema(
    {
      sale_unit_id: {
        isUUID: { errorMessage: 'sale_unit_id must be a valid UUID' }
      },
      name: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 180 }, errorMessage: 'name must be at most 180 characters' }
      },
      description: {
        optional: true,
        isString: true,
        trim: true
      },
      price: {
        isFloat: { options: { gt: 0 }, errorMessage: 'price must be a positive number' },
        toFloat: true
      },
      unit: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 20 }, errorMessage: 'unit must be at most 20 characters' }
      },
      stock_qty: {
        optional: true,
        isFloat: { options: { min: 0 }, errorMessage: 'stock_qty must be >= 0' },
        toFloat: true
      },
      image_url: {
        optional: true,
        custom: {
          options: (value: unknown) =>
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim().length <= 512),
          errorMessage: 'image_url must be a string at most 512 characters or null'
        }
      }
    },
    ['body']
  )
)
