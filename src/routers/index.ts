import { Router } from 'express'
import authRouter from '~/modules/auth/auth.router'
import farmRouter from '~/modules/farm/farm.router'
import chatbotRouter from '~/modules/chatbot/chatbot.router'

const router = Router()

router.use('/auth', authRouter)
router.use('/farm', farmRouter)
router.use('/chatbot', chatbotRouter)

export default router
