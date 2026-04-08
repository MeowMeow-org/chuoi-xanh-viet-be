import { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'

export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  //Error handler tổng nhận tất cả lỗi từ hệ thống
  //nếu là errorWithStatus

  if (err instanceof ErrorWithStatus) {
    const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message: err.message,
      data: 'errors' in err ? (err as any).errors : null
    })
  }

  //nếu là lỗi bất kỳ
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })

  const statusCode = err?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message: err?.message || 'Internal server error',
    data: null
  })
}
