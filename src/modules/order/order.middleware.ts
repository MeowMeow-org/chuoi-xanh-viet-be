import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const createOrderValidator = validate(
  checkSchema(
    {
      shop_id: {
        isUUID: { errorMessage: 'shop_id must be a valid UUID' },
        notEmpty: { errorMessage: 'shop_id is required' }
      },
      items: {
        isArray: {
          options: { min: 1 },
          errorMessage: 'items must be a non-empty array'
        }
      },
      'items.*.product_id': {
        isUUID: { errorMessage: 'product_id must be a valid UUID' }
      },
      'items.*.qty': {
        isFloat: {
          options: { min: 0.01 },
          errorMessage: 'qty must be greater than 0'
        },
        toFloat: true
      },
      shipping_name: {
        isString: true,
        trim: true,
        notEmpty: { errorMessage: 'shipping_name is required' },
        isLength: { options: { max: 120 } }
      },
      shipping_phone: {
        isString: true,
        trim: true,
        notEmpty: { errorMessage: 'shipping_phone is required' },
        isLength: { options: { max: 20 } }
      },
      shipping_address: {
        optional: { options: { nullable: true } },
        isString: true,
        trim: true
      },
      shipping_province_code: {
        optional: { options: { nullable: true } },
        isInt: { options: { gt: 0 }, errorMessage: 'shipping_province_code must be a positive integer' },
        toInt: true
      },
      shipping_district_code: {
        optional: { options: { nullable: true } },
        isInt: { options: { gt: 0 }, errorMessage: 'shipping_district_code must be a positive integer' },
        toInt: true
      },
      shipping_ward_code: {
        optional: { options: { nullable: true } },
        isInt: { options: { gt: 0 }, errorMessage: 'shipping_ward_code must be a positive integer' },
        toInt: true
      },
      shipping_province_name: {
        optional: { options: { nullable: true } },
        isString: true,
        trim: true,
        isLength: { options: { max: 120 } }
      },
      shipping_district_name: {
        optional: { options: { nullable: true } },
        isString: true,
        trim: true,
        isLength: { options: { max: 120 } }
      },
      shipping_ward_name: {
        optional: { options: { nullable: true } },
        isString: true,
        trim: true,
        isLength: { options: { max: 120 } }
      },
      shipping_detail: {
        optional: { options: { nullable: true } },
        isString: true,
        trim: true
      },
      payment_method: {
        isIn: {
          options: [['cod', 'vnpay', 'payos']],
          errorMessage: 'payment_method must be one of cod, vnpay, payos'
        }
      },
      note: {
        optional: true,
        isString: true,
        trim: true
      }
    },
    ['body']
  )
)

export const orderIdParamValidator = validate(
  checkSchema(
    {
      order_id: {
        isUUID: { errorMessage: 'order_id must be a valid UUID' }
      }
    },
    ['params']
  )
)

export const getOrdersQueryValidator = validate(
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
        isIn: {
          options: [['pending', 'confirmed', 'shipping', 'delivered', 'cancelled']],
          errorMessage: 'Invalid status'
        }
      }
    },
    ['query']
  )
)

export const shopEarningsBreakdownQueryValidator = validate(
  checkSchema(
    {
      from: { isISO8601: true, errorMessage: 'from phải là ISO 8601' },
      to: { isISO8601: true, errorMessage: 'to phải là ISO 8601' },
      bucket: {
        isIn: {
          options: [['month', 'week', 'day']],
          errorMessage: 'bucket phải là month | week | day'
        }
      }
    },
    ['query']
  )
)

export const shopEarningsOrdersQueryValidator = validate(
  checkSchema(
    {
      from: { isISO8601: true, errorMessage: 'from phải là ISO 8601' },
      to: { isISO8601: true, errorMessage: 'to phải là ISO 8601' },
      page: {
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: { options: { min: 1, max: 100 } },
        toInt: true
      }
    },
    ['query']
  )
)

export const shopEarningsByFarmQueryValidator = validate(
  checkSchema(
    {
      from: { optional: true, isISO8601: true, errorMessage: 'from phải là ISO 8601' },
      to: { optional: true, isISO8601: true, errorMessage: 'to phải là ISO 8601' }
    },
    ['query']
  )
)

export const updateOrderStatusValidator = validate(
  checkSchema(
    {
      status: {
        isIn: {
          options: [['confirmed', 'shipping', 'delivered', 'cancelled']],
          errorMessage: 'status must be one of confirmed, shipping, delivered, cancelled'
        }
      }
    },
    ['body']
  )
)
