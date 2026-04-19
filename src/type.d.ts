import { Request, Response } from 'express'
import type { account_status, user_role } from '@prisma/client'
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
        data?: any | null
        metadata?: {
          totalItems?: number
          totalPages?: number
          currentPage?: number
          itemsPerPage?: number
          hasPreviousPage?: boolean
          hasNextPage?: boolean
        }
      }) => void
    }
  }
}

declare module 'express' {
  interface Request {
    decoded_authorization?: TokenPayLoad
    decoded_refresh_token?: TokenPayLoad
    decoded_forgot_password_token?: TokenPayLoad
    current_user?: {
      id: string
      role: user_role
      status: account_status
    }
  }
}

declare module 'socket.io' {
  interface SocketData {
    userId: string
    role: user_role
    status: account_status
  }
}
