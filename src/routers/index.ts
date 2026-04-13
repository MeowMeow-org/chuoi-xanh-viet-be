import { Router } from 'express'
import authRouter from '~/modules/auth/auth.router'
import farmRouter from '~/modules/farm/farm.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

export default router
