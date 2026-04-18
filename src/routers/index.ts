import { Router } from 'express'
import anchorRouter from '~/modules/anchor/anchor.router'
import authRouter from '~/modules/auth/auth.router'
import cooperativeRouter from '~/modules/cooperative/cooperative.router'
import diaryRouter from '~/modules/diary/diary.router'
import farmRouter from '~/modules/farm/farm.router'
import forumRouter from '~/modules/forum/forum.router'
import inspectionRouter from '~/modules/inspection/inspection.router'
import shopRouter from '~/modules/shop/shop.router'
import orderRouter from '~/modules/order/order.router'
import chatRouter from '~/modules/chat/chat.router'
import saleUnitRouter from '~/modules/sale-unit/sale-unit.router'
import seasonRouter from '~/modules/season/season.router'
import traceRouter from '~/modules/trace/trace.router'
import uploadRouter from '~/modules/upload/upload.router'
import notificationRouter from '~/modules/notification/notification.router'
import shopReviewRouter from '~/modules/shop-review/shop-review.router'

const router = Router()

router.use('/auth', authRouter)

router.use('/farm', farmRouter)

router.use('/cooperative', cooperativeRouter)
router.use('/season', seasonRouter)

router.use('/diary', diaryRouter)
router.use('/inspection', inspectionRouter)
router.use('/sale-unit', saleUnitRouter)
router.use('/trace', traceRouter)

router.use('/anchor', anchorRouter)

router.use('/forum', forumRouter)

router.use('/shop', shopRouter)
router.use('/order', orderRouter)
router.use('/chat', chatRouter)

router.use('/upload', uploadRouter)
router.use('/notification', notificationRouter)
router.use('/review', shopReviewRouter)

export default router
