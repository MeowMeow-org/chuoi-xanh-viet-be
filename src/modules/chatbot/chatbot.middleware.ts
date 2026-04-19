import fs from 'fs'
import { checkSchema } from 'express-validator'
import multer from 'multer'
import path from 'path'
import { validate } from '~/utils/validation'

export const chatValidator = validate(
  checkSchema(
    {
      message: {
        isString: { errorMessage: 'Message phải là chuỗi ký tự' },
        notEmpty: { errorMessage: 'Message không được để trống' },
        trim: true,
        isLength: {
          options: { max: 2000 },
          errorMessage: 'Message không được vượt quá 2000 ký tự'
        }
      },
      conversationHistory: {
        optional: true,
        isArray: { errorMessage: 'conversationHistory phải là mảng' }
      }
    },
    ['body']
  )
)

export const marketQueryValidator = validate(
  checkSchema(
    {
      message: {
        optional: true,
        isString: { errorMessage: 'message phải là chuỗi ký tự' },
        trim: true,
        isLength: {
          options: { max: 2000 },
          errorMessage: 'message không được vượt quá 2000 ký tự'
        }
      },
      crop: {
        optional: true,
        isString: { errorMessage: 'crop phải là chuỗi ký tự' },
        trim: true
      },
      region: {
        optional: true,
        isString: { errorMessage: 'Vùng địa lý phải là chuỗi ký tự' },
        trim: true
      },
      conversationHistory: {
        optional: true,
        isArray: { errorMessage: 'conversationHistory phải là mảng' }
      }
    },
    ['body']
  )
)

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'chatbot')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `diagnose-${uniqueSuffix}${path.extname(file.originalname)}`)
  }
})

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh định dạng JPG, PNG, WEBP hoặc GIF'))
    }
  }
}).single('image')
