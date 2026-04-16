import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import type { CreateCheckpointRequestBody } from './anchor.request'
import anchorService from './anchor.service'

const mapCheckpointRow = (row: {
  id: string
  season_id: string
  checkpoint_no: number
  checkpoint_type: string
  is_final: boolean
  payload_range: unknown
  hash_algo: string
  data_hash: string
  chain_network: string | null
  tx_hash: string | null
  tx_url: string | null
  status: string
  anchored_at: Date | null
  anchor_meta: unknown
  created_at: Date
}) => ({
  id: row.id,
  seasonId: row.season_id,
  checkpointNo: row.checkpoint_no,
  checkpointType: row.checkpoint_type,
  isFinal: row.is_final,
  payloadRange: row.payload_range,
  hashAlgo: row.hash_algo,
  dataHash: row.data_hash,
  chainNetwork: row.chain_network,
  txHash: row.tx_hash,
  txUrl: row.tx_url,
  status: row.status,
  anchoredAt: row.anchored_at,
  anchorMeta: row.anchor_meta,
  createdAt: row.created_at
})

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
    message: USER_MESSAGES.GET_CANONICAL_PAYLOAD_SUCCESS,
    data: response
  })
}

export const createCheckpointAnchorController = async (
  req: Request<ParamsDictionary, unknown, CreateCheckpointRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const response = await anchorService.createCheckpointAnchor({
    userId: user_id,
    seasonId: req.params.season_id as string,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_CHECKPOINT_ANCHOR_SUCCESS,
    data: {
      anchor: mapCheckpointRow(response.anchor),
      canonicalPayload: response.canonicalPayload,
      canonicalJson: response.canonicalJson,
      payloadHash: response.payloadHash
    }
  })
}

export const listCheckpointAnchorsController = async (
  req: Request<ParamsDictionary>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const records = await anchorService.listCheckpointAnchors({
    userId: user_id,
    seasonId: req.params.season_id as string
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_CHECKPOINT_ANCHORS_SUCCESS,
    data: records.map(mapCheckpointRow)
  })
}

export const verifyCheckpointAnchorController = async (req: Request<ParamsDictionary>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const response = await anchorService.verifyCheckpointAnchor({
    userId: user_id,
    seasonId: req.params.season_id as string,
    checkpointNo: Number(req.params.checkpoint_no)
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.VERIFY_CHECKPOINT_ANCHOR_SUCCESS,
    data: {
      checkpoint: mapCheckpointRow(response.checkpoint),
      currentPayloadHash: response.currentPayloadHash,
      anchoredDataHash: response.anchoredDataHash,
      matched: response.matched
    }
  })
}
