import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type { LoginRequestBody } from './auth.request'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import authService from './auth.service'

//login controller
export const loginController = async (
  req: Request<ParamsDictionary, any, LoginRequestBody>, //
  res: Response,
  next: NextFunction
) => {
  const response = await authService.login(req.body)

  res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.LOGIN_SUCCESS,
    data: {
      accessToken: '',
      refreshToken: ''
    }
  })
}

//register controller

//refresh token controller

//logout controller

//login-google controller
