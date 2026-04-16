import { Router } from 'express'
import authRouter from '~/modules/auth/auth.router'
import farmRouter from '~/modules/farm/farm.router'
import cooperativeRouter from '~/modules/cooperative/cooperative.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

router.use('/cooperative', cooperativeRouter)

export default router
