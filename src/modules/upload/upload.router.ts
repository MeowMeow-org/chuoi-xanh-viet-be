import { Router } from 'express'
import multer from 'multer'
import { accessTokenValidator } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import { uploadImagesController } from './upload.controller'

const uploadRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 3 }
})

uploadRouter.post(
  '/',
  accessTokenValidator,
  upload.array('images', 3),
  wrapAsync(uploadImagesController)
)

export default uploadRouter
