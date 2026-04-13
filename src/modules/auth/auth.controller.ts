import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type {
  ForgotPasswordRequestBody,
  LoginRequestBody,
  TokenPayLoad,
  VerifyForgotPasswordRequestBody
} from './auth.request'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import authService from './auth.service'
import { ErrorWithStatus } from '~/models/Errors'

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
      accessToken: response.access_token,
      refreshToken: response.refresh_token
    }
  })
}

//register controller

//refresh token controller

//logout controller

//login-google controller

//forgot password controller
export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordRequestBody>, //
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body
  const isExisted = await authService.isEmailExisted(email)

  if (!isExisted) {
    throw new ErrorWithStatus({
      message: USER_MESSAGES.EMAIL_IS_NOT_EXISTED,
      status: HTTP_STATUS.NOT_FOUND
    })
  }

  await authService.forgotPassword(email)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CHECK_YOUR_EMAIL_TO_RESET_PASSWORD,
    data: null
  })
}

// verify forgot password
export const verifyForgotPasswordController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { forgot_password_token } = req.body
  const { user_id } = req.decoded_forgot_password_token as TokenPayLoad

  await authService.verifyForgotPassword({ user_id, forgot_password_token })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS,
    data: null
  })
}
