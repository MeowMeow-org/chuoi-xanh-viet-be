import { Router } from 'express'
import authRouter from '~/modules/auth/auth.router'
import diaryRouter from '~/modules/diary/diary.router'
import farmRouter from '~/modules/farm/farm.router'
import cooperativeRouter from '~/modules/cooperative/cooperative.router'
import seasonRouter from '~/modules/season/season.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

router.use('/cooperative', cooperativeRouter)
router.use('/season', seasonRouter)

router.use('/diary', diaryRouter)

export default router
