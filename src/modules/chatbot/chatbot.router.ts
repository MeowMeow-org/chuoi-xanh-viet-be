import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'
import { appGuideController, chatController, diagnoseController, marketQueryController } from './chatbot.controller'
import { appGuideValidator, chatValidator, marketQueryValidator, uploadImage } from './chatbot.middleware'

const chatbotRouter = Router()

/**
 * @desc Trò chuyện với chatbot về kỹ thuật canh tác, tiêu chuẩn VietGAP/GlobalGAP, sâu bệnh
 * @route POST /chatbot/chat
 * @access private
 */
chatbotRouter.post('/chat', accessTokenValidator, chatValidator, wrapAsync(chatController))

/**
 * @desc Chẩn đoán bệnh cây qua ảnh (Vision Language Model)
 * @route POST /chatbot/diagnose
 * @access private
 * @body multipart/form-data: image (file), note (string, optional)
 */
chatbotRouter.post(
  '/diagnose',
  (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) return next(err)
      next()
    })
  },
  accessTokenValidator,
  wrapAsync(diagnoseController)
)

/**
 * @desc Tư vấn giá thị trường nông sản
 * @route POST /chatbot/market
 * @access private
 */
chatbotRouter.post('/market', accessTokenValidator, marketQueryValidator, wrapAsync(marketQueryController))

/**
 * @desc Hướng dẫn sử dụng ứng dụng Chuỗi Xanh Việt (RAG từ tài liệu nội bộ)
 * @route POST /chatbot/guide
 * @access private
 */
chatbotRouter.post('/guide', accessTokenValidator, appGuideValidator, wrapAsync(appGuideController))

export default chatbotRouter
