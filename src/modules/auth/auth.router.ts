import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import {
  changePasswordController,
  forgotPasswordController,
  getMeController,
  issueTelegramLinkController,
  loginController,
  logoutController,
  patchMeController,
  refreshTokenController,
  registerController,
  resetPasswordController,
  verifyForgotPasswordController
} from './auth.controller'
import {
  accessTokenValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  loginValidator,
  patchMeValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  verifyForgotPasswordValidator
} from './auth.middleware'

const authRouter = Router()

/**
 * @desc Login user with email and password
 * @route POST /auth/login
 * @access public
 */
authRouter.post('/login', loginValidator, wrapAsync(loginController))

/**
 * @desc Get current user profile
 * @route GET /auth/me
 * @access private
 */
authRouter.get('/me', accessTokenValidator, wrapAsync(getMeController))

/**
 * @desc Update current user profile (e.g. avatarUrl from image upload)
 * @route PATCH /auth/me
 * @access private
 */
authRouter.patch(
  '/me',
  accessTokenValidator,
  patchMeValidator,
  wrapAsync(patchMeController)
)

/**
 * @desc Deep link Telegram (?start=…) — nông dân bật webhook + bot trước khi dùng.
 * @route POST /auth/me/telegram-link
 * @access private (farmer)
 */
authRouter.post('/me/telegram-link', accessTokenValidator, wrapAsync(issueTelegramLinkController))

/**
 * @desc Đổi mật khẩu khi đã đăng nhập
 * @route POST /auth/me/password
 * @access private
 */
authRouter.post(
  '/me/password',
  accessTokenValidator,
  changePasswordValidator,
  wrapAsync(changePasswordController)
)

// register
/**
 * @desc Register new user account
 * @route POST /auth/register
 * @access public
 */
authRouter.post('/register', registerValidator, wrapAsync(registerController))

// refresh token
/**
 * @desc Refresh access token using refresh token
 * @route POST /auth/refresh-token
 * @access public (requires valid refresh token in body)
 */
authRouter.post('/refresh-token', refreshTokenValidator, wrapAsync(refreshTokenController))

/**
 * @desc Logout (revoke refresh token session)
 * @route POST /auth/logout
 * @access public — body.refreshToken must be a valid JWT (verified like /refresh-token)
 */
authRouter.post('/logout', refreshTokenValidator, wrapAsync(logoutController))

// login-google

/**
 * @desc forgot password (use email to send reset password token)
 * @route POST /auth/forgot-password
 * @access public
 */
authRouter.post('/forgot-password', forgotPasswordValidator, wrapAsync(forgotPasswordController))

/**
 * @desc verify-forgot-password
 * @route POST /auth/verify-forgot-password
 * @access public
 */
authRouter.post('/verify-forgot-password', verifyForgotPasswordValidator, wrapAsync(verifyForgotPasswordController))

/**
 * @desc reset password
 * @route POST /auth/reset-password
 * @access public
 */
authRouter.post(
  '/reset-password',
  verifyForgotPasswordValidator,
  resetPasswordValidator,
  wrapAsync(resetPasswordController)
)

export default authRouter
