import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const createShopReviewValidator = validate(
  checkSchema(
    {
      order_id: {
        in: ['body'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'order_id must be a valid UUID'
      },
      product_id: {
        in: ['body'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'product_id must be a valid UUID'
      },
      rating: {
        in: ['body'],
        notEmpty: true,
        isInt: { options: { min: 1, max: 5 } },
        toInt: true,
        errorMessage: 'rating must be an integer from 1 to 5'
      },
      comment: {
        in: ['body'],
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 2000 } }
      }
    },
    ['body']
  )
)

export const listShopReviewsQueryValidator = validate(
  checkSchema(
    {
      page: {
        in: ['query'],
        optional: true,
        isInt: { options: { min: 1 } },
        toInt: true
      },
      limit: {
        in: ['query'],
        optional: true,
        isInt: { options: { min: 1, max: 50 } },
        toInt: true
      }
    },
    ['query']
  )
)

export const shopIdInParamsValidator = validate(
  checkSchema(
    {
      shop_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'shop_id must be a valid UUID'
      }
    },
    ['params']
  )
)

export const productIdInParamsValidator = validate(
  checkSchema(
    {
      product_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'product_id must be a valid UUID'
      }
    },
    ['params']
  )
)

export const updateShopReviewValidator = validate(
  checkSchema(
    {
      review_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'review_id must be a valid UUID'
      },
      rating: {
        in: ['body'],
        optional: true,
        isInt: { options: { min: 1, max: 5 } },
        toInt: true
      },
      comment: {
        in: ['body'],
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 2000 } }
      }
    },
    ['body', 'params']
  )
)
