import type { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { getAgriTrend } from './agri-trend.service'

export const getAgriTrendController = async (req: Request, res: Response, _next: NextFunction) => {
  const forceRefresh = req.query['refresh'] === 'true'

  const result = await getAgriTrend(forceRefresh)

  res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: 'Lấy xu hướng nông nghiệp thành công',
    data: result,
  })
}
