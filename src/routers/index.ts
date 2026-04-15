import { Router } from 'express'
import anchorRouter from '~/modules/anchor/anchor.router'
import authRouter from '~/modules/auth/auth.router'
import diaryRouter from '~/modules/diary/diary.router'
import farmRouter from '~/modules/farm/farm.router'
import seasonRouter from '~/modules/season/season.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

router.use('/season', seasonRouter)

router.use('/diary', diaryRouter)

router.use('/anchor', anchorRouter)

export default router
