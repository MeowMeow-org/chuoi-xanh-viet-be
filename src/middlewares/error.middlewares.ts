import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  //Error handler tổng nhận tất cả lỗi từ hệ thống
  //nếu là errorWithStatus

  if (err instanceof ErrorWithStatus) {
    return res
      .status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR) //
      .json(omit(err, ['status']))
  }

  //nếu là lỗi bất kỳ
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })

  return res
    .status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR) //500
    .json(omit(err, ['stack']))
}
