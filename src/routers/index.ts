import { Router } from 'express'
import anchorRouter from '~/modules/anchor/anchor.router'
import authRouter from '~/modules/auth/auth.router'
import cooperativeRouter from '~/modules/cooperative/cooperative.router'
import diaryRouter from '~/modules/diary/diary.router'
import farmRouter from '~/modules/farm/farm.router'
import forumRouter from '~/modules/forum/forum.router'
import seasonRouter from '~/modules/season/season.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

router.use('/cooperative', cooperativeRouter)
router.use('/season', seasonRouter)

router.use('/diary', diaryRouter)

router.use('/anchor', anchorRouter)

router.use('/forum', forumRouter)

export default router
