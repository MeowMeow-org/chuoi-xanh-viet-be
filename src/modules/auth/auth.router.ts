import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import {
  forgotPasswordController,
  loginController,
  logoutController,
  registerController,
  resetPasswordController,
  verifyForgotPasswordController
} from './auth.controller'
import {
  forgotPasswordValidator,
  loginValidator,
  logoutValidator,
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

// register
/**
 * @desc Register new user account
 * @route POST /auth/register
 * @access public
 */
authRouter.post('/register', registerValidator, wrapAsync(registerController))

// refresh token

/**
 * @desc Logout (revoke refresh token session)
 * @route POST /auth/logout
 * @access public (requires valid refresh token in body)
 */
authRouter.post('/logout', logoutValidator, wrapAsync(logoutController))

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
