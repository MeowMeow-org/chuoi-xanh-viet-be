import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { forgotPasswordController, loginController, verifyForgotPasswordController } from './auth.controller'
import { forgotPasswordValidator, loginValidator, verifyForgotPasswordValidator } from './auth.middleware'

const authRouter = Router()

/**
 * @desc Login user with email and password
 * @route POST /auth/login
 * @access public
 */
authRouter.post('/login', loginValidator, wrapAsync(loginController))

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
export default authRouter
