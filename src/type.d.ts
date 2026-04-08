import { Request, Response } from 'express'
import { ActionType, ResourceType } from '~/interfaces/logger.interface'
import { TokenGoogleVerifyPayload, TokenPayLoad } from '~/models/TokenPayoad'

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
