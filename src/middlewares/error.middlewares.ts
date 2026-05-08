import { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import auditService from '~/modules/audit/audit.service'

export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  //Error handler tổng nhận tất cả lỗi từ hệ thống
  //nếu là errorWithStatus

  if (err instanceof ErrorWithStatus) {
    const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
    auditService.writeBestEffort({
      module: 'system',
      action: 'request_error',
      status: 'failed',
      actorUserId: req.decoded_authorization?.user_id ?? null,
      actorRole: req.current_user?.role ?? req.decoded_authorization?.role ?? null,
      source: req.audit_context?.source ?? 'api',
      requestId: req.audit_context?.request_id ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      path: req.originalUrl ?? req.path,
      method: req.method,
      errorCode: String(statusCode),
      errorMessage: err.message
    })
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
  auditService.writeBestEffort({
    module: 'system',
    action: 'request_error',
    status: 'failed',
    actorUserId: req.decoded_authorization?.user_id ?? null,
    actorRole: req.current_user?.role ?? req.decoded_authorization?.role ?? null,
    source: req.audit_context?.source ?? 'api',
    requestId: req.audit_context?.request_id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    path: req.originalUrl ?? req.path,
    method: req.method,
    errorCode: String(statusCode),
    errorMessage: err?.message || 'Internal server error'
  })
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message: err?.message || 'Internal server error',
    data: null
  })
}
