import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import type { TokenPayLoad } from '../auth/auth.request'
import anchorService from './anchor.service'

export const getCanonicalPayloadPreviewController = async (
  req: Request<ParamsDictionary>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const response = await anchorService.buildCanonicalPayload({
    userId: user_id,
    seasonId: req.params.season_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: 'Get canonical payload successfully',
    data: response
  })
}
