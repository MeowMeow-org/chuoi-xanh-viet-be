import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import {
  forgotPasswordController,
  getMeController,
  loginController,
  resetPasswordController,
  verifyForgotPasswordController
} from './auth.controller'
import {
  accessTokenValidator,
  forgotPasswordValidator,
  loginValidator,
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

// register

// refresh token

// logout

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
