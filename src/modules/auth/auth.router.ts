import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { loginController } from './auth.controller'
import { loginValidator } from './auth.middleware'

const authRouter = Router()

/**
 * @desc Login user with email and password
 * @route POST /auth/login
 * @access public
 */
authRouter.post('/login', loginValidator, wrapAsync(loginController))

export default authRouter
