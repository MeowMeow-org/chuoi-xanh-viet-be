import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import type {
  ChangePasswordRequestBody,
  ForgotPasswordRequestBody,
  RefreshTokenRequestBody,
  LoginRequestBody,
  LogoutRequestBody,
  PatchMeRequestBody,
  RegisterRequestBody,
  ResetPasswordRequestBody,
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
      refreshToken: response.refresh_token,
      user: {
        id: response.user.id,
        fullName: response.user.full_name,
        email: response.user.email,
        phone: response.user.phone,
        role: response.user.role,
        status: response.user.status,
        avatarUrl: response.user.avatar_url ?? null,
        zaloUserId: response.user.zalo_user_id ?? null
      }
    }
  })
}

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const user = await authService.getMe(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_ME_SUCCESS,
    data: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatar_url ?? null,
      zaloUserId: user.zalo_user_id ?? null
    }
  })
}

export const patchMeController = async (
  req: Request<ParamsDictionary, unknown, PatchMeRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const body = req.body
  const avatarRaw =
    body.avatarUrl === undefined
      ? undefined
      : body.avatarUrl === null
        ? null
        : typeof body.avatarUrl === 'string'
          ? body.avatarUrl.trim() === ''
            ? null
            : body.avatarUrl.trim()
          : undefined

  const zaloRaw =
    body.zaloUserId === undefined
      ? undefined
      : body.zaloUserId === null
        ? null
        : typeof body.zaloUserId === 'string'
          ? body.zaloUserId.trim() === ''
            ? null
            : body.zaloUserId.trim()
          : undefined

  const payload: {
    avatar_url?: string | null
    full_name?: string
    phone?: string
    zalo_user_id?: string | null
  } = {}

  if (avatarRaw !== undefined) {
    payload.avatar_url = avatarRaw
  }
  if (body.fullName !== undefined) {
    payload.full_name = String(body.fullName).trim()
  }
  if (body.phone !== undefined) {
    payload.phone = String(body.phone).trim()
  }
  if (zaloRaw !== undefined) {
    payload.zalo_user_id = zaloRaw
  }

  const user = await authService.updateMe(user_id, payload)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_PROFILE_SUCCESS,
    data: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatar_url ?? null,
      zaloUserId: user.zalo_user_id ?? null
    }
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, unknown, ChangePasswordRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const { currentPassword, newPassword } = req.body

  await authService.changePassword({
    user_id,
    currentPassword,
    newPassword
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CHANGE_PASSWORD_SUCCESS,
    data: null
  })
}

//register controller
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const response = await authService.register(req.body)

  res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.REGISTER_SUCCESS,
    data: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: {
        id: response.user.id,
        fullName: response.user.full_name,
        email: response.user.email,
        phone: response.user.phone,
        role: response.user.role,
        status: response.user.status,
        avatarUrl: response.user.avatar_url ?? null,
        zaloUserId: response.user.zalo_user_id ?? null
      }
    }
  })
}

//refresh token controller
export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body
  const { user_id } = req.decoded_refresh_token as TokenPayLoad
  const response = await authService.refreshToken({ user_id, refresh_token: refreshToken })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.REFRESH_TOKEN_SUCCESS,
    data: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token
    }
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { refreshToken } = req.body
  const { user_id } = req.decoded_refresh_token as TokenPayLoad

  await authService.logout({ user_id, refresh_token: refreshToken })

  res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.LOGOUT_SUCCESS,
    data: null
  })
}

//login-google controller

//forgot password controller
export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordRequestBody>, //
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body

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

// reset password controller
export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { password, forgot_password_token } = req.body
  const { user_id } = req.decoded_forgot_password_token as TokenPayLoad

  //còn hạn token không
  await authService.verifyForgotPassword({ user_id, forgot_password_token })

  await authService.resetPassword({ user_id, password })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.RESET_PASSWORD_SUCCESS,
    data: null
  })
}
