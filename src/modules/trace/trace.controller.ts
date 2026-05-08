import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import traceService from './trace.service'

const decimalStr = (v: unknown) =>
  v !== null && v !== undefined && typeof (v as { toString?: () => string })?.toString === 'function'
    ? (v as { toString: () => string }).toString()
    : null

const mapSaleUnitRow = (row: any) => ({
  id: row.id,
  seasonId: row.season_id,
  code: row.code,
  quantity: decimalStr(row.quantity),
  unit: row.unit,
  qrToken: row.qr_token,
  qrUrl: row.qr_url,
  shortCode: row.short_code,
  status: row.status,
  createdAt: row.created_at
})

const mapAnchorRow = (row: any) => ({
  id: row.id,
  checkpointNo: row.checkpoint_no,
  checkpointType: row.checkpoint_type,
  isFinal: row.is_final,
  dataHash: row.data_hash,
  chainNetwork: row.chain_network,
  txHash: row.tx_hash,
  txUrl: row.tx_url,
  status: row.status,
  anchoredAt: row.anchored_at,
  anchorMeta: row.anchor_meta,
  createdAt: row.created_at
})

const mapDiaryRow = (row: any) => ({
  id: row.id,
  seasonId: row.season_id,
  farmId: row.farm_id,
  actorUserId: row.actor_user_id,
  eventType: row.event_type,
  eventDate: row.event_date,
  serverTimestamp: row.server_timestamp,
  description: row.description,
  extraData: row.extra_data,
  createdAt: row.created_at,
  attachments: (row.diary_attachments ?? []).map((a: any) => ({
    id: a.id,
    fileUrl: a.file_url,
    mimeType: a.mime_type,
    sortOrder: a.sort_order,
    meta: a.meta
  })),
  actor: row.users
    ? {
        id: row.users.id,
        fullName: row.users.full_name,
        role: row.users.role
      }
    : null
})

export const resolveTraceController = async (req: Request<{ code: string }>, res: Response, _next: NextFunction) => {
  const saleUnit = await traceService.resolveByCode({
    code: req.params.code,
    meta: {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null
    }
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.TRACE_RESOLVE_SUCCESS,
    data: mapSaleUnitRow(saleUnit)
  })
}

export const getSeasonTraceController = async (req: Request<{ season_id: string }>, res: Response, _next: NextFunction) => {
  const { season } = await traceService.getSeasonTrace({ seasonId: req.params.season_id })

  const membership = season.farms.cooperative_members[0]
  const cooperative = membership
    ? {
        verifiedAt: membership.verified_at,
        cooperativeUser: {
          id: membership.cooperative_user.id,
          fullName: membership.cooperative_user.full_name,
          email: membership.cooperative_user.email,
          avatarUrl: membership.cooperative_user.avatar_url
        }
      }
    : null

  const owner = season.farms.users
    ? {
        id: season.farms.users.id,
        fullName: season.farms.users.full_name,
        email: season.farms.users.email,
        phone: season.farms.users.phone,
        avatarUrl: season.farms.users.avatar_url
      }
    : null

  const data = {
    season: {
      id: season.id,
      farmId: season.farm_id,
      code: season.code,
      cropName: season.crop_name,
      startDate: season.start_date,
      harvestStartDate: season.harvest_start_date,
      harvestEndDate: season.harvest_end_date,
      estimatedYield: decimalStr(season.estimated_yield),
      actualYield: decimalStr(season.actual_yield),
      yieldUnit: season.yield_unit,
      status: season.status,
      sealedAt: season.sealed_at,
      createdAt: season.created_at,
      updatedAt: season.updated_at
    },
    farm: {
      id: season.farms.id,
      name: season.farms.name,
      areaHa: decimalStr(season.farms.area_ha),
      cropMain: season.farms.crop_main,
      province: season.farms.province,
      district: season.farms.district,
      ward: season.farms.ward,
      address: season.farms.address,
      latitude: decimalStr(season.farms.latitude),
      longitude: decimalStr(season.farms.longitude),
      inCooperative: season.farms.in_cooperative
    },
    owner,
    cooperative,
    diaries: season.diary_entries.map(mapDiaryRow),
    saleUnits: season.sale_units.map(mapSaleUnitRow),
    anchors: season.season_anchors.map(mapAnchorRow)
  }

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.TRACE_DETAIL_SUCCESS,
    data
  })
}

export const verifyTraceController = async (req: Request<{ season_id: string }>, res: Response, _next: NextFunction) => {
  const result = await traceService.verifySeason({ seasonId: req.params.season_id })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.TRACE_VERIFY_SUCCESS,
    data: {
      currentHash: result.currentHash,
      onChainHash: result.onChainHash,
      match: result.match,
      anchor: result.anchor ? mapAnchorRow(result.anchor) : null
    }
  })
}
