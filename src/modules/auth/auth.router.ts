import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { loginController } from './auth.controller'

const authRouter = Router()

/**
 * @desc Login user with email and password
 * @route POST /auth/login
 * @access public
 */
authRouter.post('/login', wrapAsync(loginController))

export default authRouter
