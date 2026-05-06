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
import authService, { type AuthPublicUser } from './auth.service'
import auditService from '~/modules/audit/audit.service'
import { ErrorWithStatus } from '~/models/Errors'
import { isTelegramDeepLinkConfigured, issueTelegramDeepLinkForUser } from '~/modules/telegram/telegramLink.service'

/** JSON cho login/register/getMe — gồm HTX + Telegram. */
function serializePublicAuthUser(user: AuthPublicUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    onBoarding: user.onBoarding,
    avatarUrl: user.avatarUrl,
    zaloUserId: user.zaloUserId,
    telegramLinked: user.telegramLinked,
    contactAddress: user.contactAddress,
    province: user.province,
    district: user.district,
    ward: user.ward,
    provinceCode: user.provinceCode,
    districtCode: user.districtCode,
    wardCode: user.wardCode,
    latitude: user.latitude,
    longitude: user.longitude
  }
}

//login controller
export const loginController = async (
  req: Request<ParamsDictionary, any, LoginRequestBody>, //
  res: Response,
  next: NextFunction
) => {
  const response = await authService.login(req.body)
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'login',
    entityType: 'user',
    entityId: response.user.id,
    status: 'success',
    afterData: { role: response.user.role, status: response.user.status }
  })

  res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.LOGIN_SUCCESS,
    data: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: serializePublicAuthUser(response.user)
    }
  })
}

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const user = await authService.getMe(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_ME_SUCCESS,
    data: serializePublicAuthUser(user)
  })
}

export const patchMeController = async (
  req: Request<ParamsDictionary, unknown, PatchMeRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const beforeUser = await authService.getMe(user_id)
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

  const contactRaw =
    body.contactAddress === undefined
      ? undefined
      : body.contactAddress === null
        ? null
        : typeof body.contactAddress === 'string'
          ? body.contactAddress.trim() === ''
            ? null
            : body.contactAddress.trim()
          : undefined

  const payload: {
    avatar_url?: string | null
    full_name?: string
    phone?: string
    zalo_user_id?: string | null
    contact_address?: string | null
    province?: string | null
    district?: string | null
    ward?: string | null
    province_code?: number | null
    district_code?: number | null
    ward_code?: number | null
    latitude?: number | null
    longitude?: number | null
    unlinkTelegram?: boolean
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
  if (contactRaw !== undefined) {
    payload.contact_address = contactRaw
  }

  const strOrNull = (v: unknown): string | null | undefined => {
    if (v === undefined) return undefined
    if (v === null) return null
    if (typeof v === 'string') return v
    return undefined
  }
  const codeOrNull = (v: unknown): number | null | undefined => {
    if (v === undefined) return undefined
    if (v === null) return null
    if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v
    return undefined
  }
  const coordOrNull = (v: unknown): number | null | undefined => {
    if (v === undefined) return undefined
    if (v === null) return null
    if (typeof v === 'number' && Number.isFinite(v)) return v
    return undefined
  }

  const p = strOrNull(body.province)
  if (p !== undefined) payload.province = p
  const d = strOrNull(body.district)
  if (d !== undefined) payload.district = d
  const w = strOrNull(body.ward)
  if (w !== undefined) payload.ward = w

  const pc = codeOrNull(body.provinceCode)
  if (pc !== undefined) payload.province_code = pc
  const dc = codeOrNull(body.districtCode)
  if (dc !== undefined) payload.district_code = dc
  const wc = codeOrNull(body.wardCode)
  if (wc !== undefined) payload.ward_code = wc

  const lat = coordOrNull(body.latitude)
  const lng = coordOrNull(body.longitude)
  if (lat !== undefined) payload.latitude = lat
  if (lng !== undefined) payload.longitude = lng
  if (body.unlinkTelegram === true) {
    payload.unlinkTelegram = true
  }

  const user = await authService.updateMe(user_id, payload)
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'update_profile',
    entityType: 'user',
    entityId: user.id,
    status: 'success',
    beforeData: {
      fullName: beforeUser.fullName,
      phone: beforeUser.phone,
      avatarUrl: beforeUser.avatarUrl,
      zaloUserId: beforeUser.zaloUserId,
      contactAddress: beforeUser.contactAddress,
      provinceCode: beforeUser.provinceCode,
      districtCode: beforeUser.districtCode,
      wardCode: beforeUser.wardCode
    },
    afterData: {
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      zaloUserId: user.zaloUserId,
      contactAddress: user.contactAddress,
      provinceCode: user.provinceCode,
      districtCode: user.districtCode,
      wardCode: user.wardCode
    }
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_PROFILE_SUCCESS,
    data: serializePublicAuthUser(user)
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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'change_password',
    entityType: 'user',
    entityId: user_id,
    status: 'success'
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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'register',
    entityType: 'user',
    entityId: response.user.id,
    status: 'success',
    afterData: { role: response.user.role, status: response.user.status }
  })

  res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.REGISTER_SUCCESS,
    data: {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: serializePublicAuthUser(response.user)
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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'refresh_token',
    entityType: 'user',
    entityId: user_id,
    status: 'success'
  })

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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'logout',
    entityType: 'user',
    entityId: user_id,
    status: 'success'
  })

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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'forgot_password',
    entityType: 'user',
    status: 'success',
    afterData: { email }
  })

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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'verify_forgot_password',
    entityType: 'user',
    entityId: user_id,
    status: 'success'
  })

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
  await auditService.writeFromRequest(req, {
    module: 'auth',
    action: 'reset_password',
    entityType: 'user',
    entityId: user_id,
    status: 'success'
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.RESET_PASSWORD_SUCCESS,
    data: null
  })
}

export const issueTelegramLinkController = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const me = await authService.getMe(user_id)

  if (me.role !== 'farmer') {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.FORBIDDEN,
      message: USER_MESSAGES.TELEGRAM_LINK_FARMER_ONLY
    })
  }

  if (!isTelegramDeepLinkConfigured()) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USER_MESSAGES.TELEGRAM_DEEP_LINK_NOT_CONFIGURED
    })
  }

  const { deepLink, expiresInSeconds } = await issueTelegramDeepLinkForUser(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.TELEGRAM_LINK_ISSUED,
    data: {
      deepLink,
      expiresInSeconds
    }
  })
}
