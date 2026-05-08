import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import fs from 'fs'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errors'
import type { ChatRequestBody, DiagnoseRequestBody, MarketQueryRequestBody } from './chatbot.request'
import chatbotService from './chatbot.service'

export const chatController = async (
  req: Request<ParamsDictionary, any, ChatRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { message, conversationHistory } = req.body

  const result = await chatbotService.chat(message, conversationHistory)

  res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: 'Chatbot trả lời thành công',
    data: {
      reply: result.reply,
      usage: result.usage
    }
  })
}

export const diagnoseController = async (
  req: Request<ParamsDictionary, any, DiagnoseRequestBody>,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.BAD_REQUEST,
      message: 'Vui lòng upload ảnh cây trồng cần chẩn đoán'
    })
  }

  const { note } = req.body
  const { path: imagePath, mimetype } = req.file

  try {
    const result = await chatbotService.diagnoseFromImage(imagePath, mimetype, note)

    res.sendResponse({
      statusCode: HTTP_STATUS.OK,
      message: 'Chẩn đoán bệnh cây thành công',
      data: {
        diagnosis: result.diagnosis,
        usage: result.usage
      }
    })
  } finally {
    // Xoá file ảnh tạm sau khi xử lý xong
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
    }
  }
}

export const marketQueryController = async (
  req: Request<ParamsDictionary, any, MarketQueryRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const rawMessage = String(req.body.message ?? '').trim()
  const rawCrop = String(req.body.crop ?? '').trim()
  const region = String(req.body.region ?? '').trim() || undefined
  const { conversationHistory } = req.body

  const primary = rawMessage || rawCrop
  if (!primary) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: 'Cần có message (nội dung chat) hoặc crop'
    })
  }

  const cropHintForModel = rawCrop && rawCrop !== primary ? rawCrop : undefined

  const result = await chatbotService.queryMarketPrice(
    primary,
    { cropHint: cropHintForModel, region },
    conversationHistory ?? []
  )

  res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: 'Tư vấn thị trường thành công',
    data: {
      advice: result.advice,
      message: primary,
      crop: rawCrop || null,
      region: region || null,
      sources: result.searchResults,
      usage: result.usage
    }
  })
}
