import { Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import uploadService from './upload.service'

export const uploadImagesController = async (req: Request<ParamsDictionary>, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined
  const list = files?.length ? files : []
  if (list.length === 0) {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.UPLOAD_IMAGES_REQUIRED,
      status: HTTP_STATUS.BAD_REQUEST
    })
  }

  const data = await uploadService.uploadImages(list)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPLOAD_IMAGES_SUCCESS,
    data
  })
}
