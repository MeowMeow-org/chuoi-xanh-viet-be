import { checkSchema } from 'express-validator'
import { ALLOWED_FORUM_LABELS } from '~/constants/forum-labels'
import { validate } from '~/utils/validation'

export const forumPostIdValidator = validate(
  checkSchema(
    {
      post_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'post_id must be a valid UUID'
      }
    },
    ['params']
  )
)

export const forumCommentIdValidator = validate(
  checkSchema(
    {
      comment_id: {
        in: ['params'],
        notEmpty: true,
        isUUID: true,
        errorMessage: 'comment_id must be a valid UUID'
      }
    },
    ['params']
  )
)

const labelListValidator = {
  notEmpty: true,
  isArray: {
    options: { min: 1, max: 10 }
  },
  errorMessage: 'labels must be a non-empty array (max 10)'
}

const eachLabelInWhitelist = {
  custom: {
    options: (arr: unknown) => {
      if (!Array.isArray(arr)) return false
      return arr.every(
        (item) => typeof item === 'string' && ALLOWED_FORUM_LABELS.includes(item as (typeof ALLOWED_FORUM_LABELS)[number])
      )
    },
    errorMessage: `each label must be one of: ${ALLOWED_FORUM_LABELS.join(', ')}`
  }
}

const forumPostImagesBodyValidator = {
  optional: true,
  isArray: {
    options: { max: 3 }
  },
  custom: {
    options: (arr: unknown) => {
      if (arr === undefined) return true
      if (!Array.isArray(arr) || arr.length > 3) return false
      return arr.every((item) => {
        if (!item || typeof item !== 'object') return false
        const o = item as Record<string, unknown>
        const key = typeof o.objectKey === 'string' ? o.objectKey.trim() : ''
        const url = typeof o.url === 'string' ? o.url.trim() : ''
        return key.length > 0 && key.length <= 2048 && url.length > 0 && url.length <= 8192
      })
    },
    errorMessage:
      'images must be an array (max 3); each item needs objectKey (max 2048 chars) and url (max 8192 chars)'
  }
}

export const createForumPostValidator = validate(
  checkSchema(
    {
      title: {
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 220 } },
        errorMessage: 'title must be a string from 1 to 220 chars'
      },
      content: {
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 20000 } },
        errorMessage: 'content must be a string from 1 to 20000 chars'
      },
      labels: {
        ...labelListValidator,
        ...eachLabelInWhitelist
      },
      images: forumPostImagesBodyValidator
    },
    ['body']
  )
)

export const updateForumPostValidator = validate(
  checkSchema(
    {
      title: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 220 } },
        errorMessage: 'title must be a string from 1 to 220 chars'
      },
      content: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 20000 } },
        errorMessage: 'content must be a string from 1 to 20000 chars'
      },
      labels: {
        optional: true,
        isArray: {
          options: { min: 1, max: 10 }
        },
        custom: {
          options: (arr: unknown) => {
            if (arr === undefined) return true
            if (!Array.isArray(arr)) return false
            return arr.every(
              (item) =>
                typeof item === 'string' &&
                ALLOWED_FORUM_LABELS.includes(item as (typeof ALLOWED_FORUM_LABELS)[number])
            )
          },
          errorMessage: `each label must be one of: ${ALLOWED_FORUM_LABELS.join(', ')}`
        }
      },
      images: forumPostImagesBodyValidator,
      status: {
        optional: true,
        isIn: {
          options: [['active', 'hidden', 'locked']]
        },
        errorMessage: 'status must be active, hidden, or locked'
      }
    },
    ['body']
  )
)

export const getForumPostsQueryValidator = validate(
  checkSchema(
    {
      label: {
        optional: true,
        isIn: {
          options: [ALLOWED_FORUM_LABELS as unknown as string[]]
        },
        errorMessage: `label must be one of: ${ALLOWED_FORUM_LABELS.join(', ')}`
      },
      searchTerm: {
        optional: true,
        isString: true,
        trim: true,
        isLength: { options: { max: 200 } },
        errorMessage: 'searchTerm must be a string (max 200 chars)'
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

export const createForumCommentValidator = validate(
  checkSchema(
    {
      content: {
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 10000 } },
        errorMessage: 'content must be a string from 1 to 10000 chars'
      }
    },
    ['body']
  )
)

export const updateForumCommentValidator = validate(
  checkSchema(
    {
      content: {
        notEmpty: true,
        isString: true,
        trim: true,
        isLength: { options: { min: 1, max: 10000 } },
        errorMessage: 'content must be a string from 1 to 10000 chars'
      }
    },
    ['body']
  )
)

export const getForumCommentsQueryValidator = validate(
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
      }
    },
    ['query']
  )
)
