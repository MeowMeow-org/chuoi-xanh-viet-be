import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator } from '~/modules/auth/auth.middleware'
import { getAgriTrendController } from './agri-trend.controller'

const agriTrendRouter = Router()

/**
 * @desc Lấy xu hướng nông nghiệp real-time: cây trồng hot, tín hiệu thị trường, công nghệ mới, cảnh báo
 * @route GET /agri-trend
 * @access private
 * @query refresh=true  Bỏ qua cache, lấy dữ liệu mới ngay (dùng khi cần thiết)
 */
agriTrendRouter.get('/', accessTokenValidator, wrapAsync(getAgriTrendController))

export default agriTrendRouter
