import { Router } from 'express'
import multer from 'multer'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { uploadDocumentsController, uploadImagesController } from './upload.controller'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'

const uploadRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 3 }
})

const DOCUMENT_MIME_ALLOW = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
])

const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype?.toLowerCase() || ''
    if (DOCUMENT_MIME_ALLOW.has(mime)) {
      cb(null, true)
      return
    }
    const err = new Error(USER_MESSAGES.DOCUMENT_FILE_TYPE_NOT_ALLOWED) as Error & { status?: number }
    err.status = HTTP_STATUS.BAD_REQUEST
    cb(err)
  }
})

uploadRouter.post(
  '/',
  accessTokenValidator,
  upload.array('images', 3),
  wrapAsync(uploadImagesController)
)

uploadRouter.post(
  '/documents',
  accessTokenValidator,
  uploadDocuments.array('documents', 5),
  wrapAsync(uploadDocumentsController)
)

export default uploadRouter
