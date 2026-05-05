import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { telegramWebhookController } from './telegramWebhook.controller'

const telegramRouter = Router()

/**
 * Webhook từ Telegram (Update JSON).
 * POST /integrations/telegram/webhook
 */
telegramRouter.post('/webhook', wrapAsync(telegramWebhookController))

export default telegramRouter
