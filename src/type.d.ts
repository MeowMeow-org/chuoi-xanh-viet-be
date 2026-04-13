import { Request, Response } from 'express'
import { ActionType, ResourceType } from '~/interfaces/logger.interface'
import { TokenPayLoad } from './modules/auth/auth.request'

declare global {
  namespace Express {
    //
    interface Response {
      sendResponse: ({
        statusCode,
        message,
        data,
        metadata
      }: {
        statusCode: number
        message: string
        data: any
        metadata?: any
      }) => void
    }
  }
}

declare module 'express' {
  interface Request {
    decoded_authorization?: TokenPayLoad
    decoded_refresh_token?: TokenPayLoad
    decoded_forgot_password_token?: TokenPayLoad
  }
}
