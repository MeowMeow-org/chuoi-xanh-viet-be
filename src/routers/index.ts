import { Router } from 'express'
import authRouter from '~/modules/auth/auth.router'
import farmRouter from '~/modules/farm/farm.router'
import seasonRouter from '~/modules/season/season.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

router.use('/season', seasonRouter)

export default router
