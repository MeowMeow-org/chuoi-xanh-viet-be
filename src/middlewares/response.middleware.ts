import { NextFunction, Request, Response } from 'express'

interface ApiResponse {
  success: boolean
  statusCode: number
  message: string
  data?: any
}

export const syncResponseMiddleware = (
  req: Request, //
  res: Response,
  next: NextFunction
) => {
  res.sendResponse = ({
    statusCode, //
    message,
    data
  }: {
    statusCode: number
    message: string
    data?: any
  }) => {
    const response: ApiResponse = {
      success: statusCode >= 200 && statusCode < 300,
      statusCode,
      message,
      data: data || null
    }
    res.status(statusCode).json(response)
  }
  next()
}
