import { NextFunction, Request, Response } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type { TokenPayLoad } from '../auth/auth.request'
import certificateService from './certificate.service'
import {
  resolveFarmCertificateBadges,
  serializeBadges
} from './certificate.badge'
import auditService from '~/modules/audit/audit.service'

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

type CoopCertBody = {
  type: 'vietgap' | 'globalgap' | 'organic' | 'other'
  certificate_no?: string | null
  issuer?: string | null
  issued_at?: string | null
  expires_at?: string | null
  file_url: string
}

type FarmCertBody = CoopCertBody & { farm_id: string }

type ListQuery = {
  page?: string
  limit?: string
  status?: string
  type?: 'vietgap' | 'globalgap' | 'organic' | 'other'
  farmId?: string
}

// ========= COOP =========
export const createCoopCertController = async (
  req: Request<ParamsDictionary, unknown, CoopCertBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const created = await certificateService.createCoopCert(user_id, {
    type: req.body.type,
    certificate_no: req.body.certificate_no ?? null,
    issuer: req.body.issuer ?? null,
    issued_at: parseDate(req.body.issued_at),
    expires_at: parseDate(req.body.expires_at),
    file_url: req.body.file_url
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'create_coop_certificate',
    entityType: 'cooperative_certificate',
    entityId: created.id,
    status: 'success',
    afterData: { type: created.type, status: created.status }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_CREATE_SUCCESS,
    data: created
  })
}

export const listMyCoopCertsController = async (
  req: Request<ParamsDictionary, unknown, unknown, ListQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page = req.query.page ? Number(req.query.page) : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const { items, meta } = await certificateService.listCoopCerts({
    cooperativeUserId: user_id,
    status: req.query.status as any,
    type: req.query.type as any,
    page,
    limit
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_LIST_SUCCESS,
    data: { items, meta }
  })
}

export const updateCoopCertController = async (
  req: Request<{ certificateId: string }, unknown, Partial<CoopCertBody>>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const updated = await certificateService.updateCoopCert(
    req.params.certificateId,
    user_id,
    {
      type: req.body.type,
      certificate_no: req.body.certificate_no ?? undefined,
      issuer: req.body.issuer ?? undefined,
      issued_at:
        req.body.issued_at === undefined
          ? undefined
          : parseDate(req.body.issued_at),
      expires_at:
        req.body.expires_at === undefined
          ? undefined
          : parseDate(req.body.expires_at),
      file_url: req.body.file_url ?? undefined
    }
  )
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'update_coop_certificate',
    entityType: 'cooperative_certificate',
    entityId: updated.id,
    status: 'success',
    afterData: { type: updated.type, status: updated.status }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_UPDATE_SUCCESS,
    data: updated
  })
}

export const deleteCoopCertController = async (
  req: Request<{ certificateId: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await certificateService.deleteCoopCert(req.params.certificateId, user_id)
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'delete_coop_certificate',
    entityType: 'cooperative_certificate',
    entityId: req.params.certificateId,
    status: 'success'
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_DELETE_SUCCESS,
    data: null
  })
}

export const revokeCoopCertController = async (
  req: Request<{ certificateId: string }, unknown, { reason: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const updated = await certificateService.revokeCoopCert({
    certificateId: req.params.certificateId,
    adminUserId: user_id,
    reason: req.body.reason
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'revoke_coop_certificate',
    entityType: 'cooperative_certificate',
    entityId: updated.id,
    status: 'success',
    afterData: { status: updated.status }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_REVOKE_SUCCESS,
    data: updated
  })
}

export const addScopeFarmController = async (
  req: Request<{ certificateId: string }, unknown, { farm_id: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const row = await certificateService.addScopeFarm({
    certificateId: req.params.certificateId,
    cooperativeUserId: user_id,
    farmId: req.body.farm_id
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'add_scope_farm',
    entityType: 'cooperative_certificate_scope',
    entityId: row.id,
    status: 'success',
    afterData: row
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_SCOPE_ADD_SUCCESS,
    data: row
  })
}

export const removeScopeFarmController = async (
  req: Request<{ certificateId: string; farmId: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await certificateService.removeScopeFarm({
    certificateId: req.params.certificateId,
    cooperativeUserId: user_id,
    farmId: req.params.farmId
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'remove_scope_farm',
    entityType: 'cooperative_certificate_scope',
    entityId: req.params.farmId,
    status: 'success',
    afterData: { certificateId: req.params.certificateId, farmId: req.params.farmId }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_SCOPE_REMOVE_SUCCESS,
    data: null
  })
}

export const listScopeOfCertController = async (
  req: Request<{ certificateId: string }, unknown, unknown, Record<string, unknown>>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page =
    req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit =
    req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const searchTerm =
    typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined

  const { items, meta } = await certificateService.listScopeOfCert({
    certificateId: req.params.certificateId,
    cooperativeUserId: user_id,
    page,
    limit,
    searchTerm
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_LIST_SUCCESS,
    data: { items, meta }
  })
}

export const listEligibleMembersForScopeController = async (
  req: Request<{ certificateId: string }, unknown, unknown, Record<string, unknown>>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page =
    req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit =
    req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const searchTerm =
    typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined

  const { items, meta } =
    await certificateService.listEligibleMembersForCertScope({
      certificateId: req.params.certificateId,
      cooperativeUserId: user_id,
      page,
      limit,
      searchTerm
    })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_LIST_SUCCESS,
    data: {
      items: items.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        verifiedAt: row.verified_at,
        note: row.note,
        farmer: {
          id: row.farmer_user.id,
          fullName: row.farmer_user.full_name,
          email: row.farmer_user.email,
          phone: row.farmer_user.phone,
          role: row.farmer_user.role
        },
        farm: {
          id: row.farms.id,
          name: row.farms.name,
          province: row.farms.province,
          district: row.farms.district,
          ward: row.farms.ward,
          inCooperative: row.farms.in_cooperative
        }
      })),
      meta
    }
  })
}

// ========= FARM =========
export const createFarmCertController = async (
  req: Request<ParamsDictionary, unknown, FarmCertBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const created = await certificateService.createFarmCert({
    ownerUserId: user_id,
    input: {
      farm_id: req.body.farm_id,
      type: req.body.type,
      certificate_no: req.body.certificate_no ?? null,
      issuer: req.body.issuer ?? null,
      issued_at: parseDate(req.body.issued_at),
      expires_at: parseDate(req.body.expires_at),
      file_url: req.body.file_url
    }
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'create_farm_certificate',
    entityType: 'farm_certificate',
    entityId: created.id,
    status: 'success',
    afterData: {
      farmId: created.farm_id,
      reviewerCooperativeId: created.reviewer_cooperative_id,
      approverScope: created.approver_scope
    }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_FARM_UPLOAD_SUCCESS,
    data: created
  })
}

export const listMyFarmCertsController = async (
  req: Request<ParamsDictionary, unknown, unknown, ListQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page = req.query.page ? Number(req.query.page) : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const { items, meta } = await certificateService.listFarmCertsForOwner({
    ownerUserId: user_id,
    status: req.query.status as any,
    farmId: req.query.farmId,
    page,
    limit
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_LIST_SUCCESS,
    data: { items, meta }
  })
}

export const listPendingFarmCertsForCoopController = async (
  req: Request<ParamsDictionary, unknown, unknown, ListQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const page = req.query.page ? Number(req.query.page) : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const { items, meta } = await certificateService.listFarmCertsPendingForCoop({
    cooperativeUserId: user_id,
    page,
    limit
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_LIST_SUCCESS,
    data: { items, meta }
  })
}

export const listPendingFarmCertsForAdminController = async (
  req: Request<ParamsDictionary, unknown, unknown, ListQuery>,
  res: Response
) => {
  const page = req.query.page ? Number(req.query.page) : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const { items, meta } = await certificateService.listFarmCertsPendingForAdmin({
    page,
    limit
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_LIST_SUCCESS,
    data: { items, meta }
  })
}

export const approveFarmCertController = async (
  req: Request<{ certificateId: string }, unknown, { note?: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const currentUser = (req as any).current_user as { role: string } | undefined
  const role = currentUser?.role === 'admin' ? 'admin' : 'cooperative'
  const note = typeof req.body?.note === 'string' ? req.body.note : undefined
  const updated = await certificateService.approveFarmCert({
    certificateId: req.params.certificateId,
    reviewerUserId: user_id,
    reviewerRole: role,
    note
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'approve_farm_certificate',
    entityType: 'farm_certificate',
    entityId: updated.id,
    status: 'success',
    afterData: { status: updated.status }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_APPROVE_SUCCESS,
    data: updated
  })
}

export const rejectFarmCertController = async (
  req: Request<{ certificateId: string }, unknown, { reason: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const currentUser = (req as any).current_user as { role: string } | undefined
  const role = currentUser?.role === 'admin' ? 'admin' : 'cooperative'
  const updated = await certificateService.rejectFarmCert({
    certificateId: req.params.certificateId,
    reviewerUserId: user_id,
    reviewerRole: role,
    reason: req.body.reason
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'reject_farm_certificate',
    entityType: 'farm_certificate',
    entityId: updated.id,
    status: 'success',
    afterData: { status: updated.status }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_REJECT_SUCCESS,
    data: updated
  })
}

export const revokeFarmCertController = async (
  req: Request<{ certificateId: string }, unknown, { reason: string }>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const updated = await certificateService.revokeFarmCert({
    certificateId: req.params.certificateId,
    adminUserId: user_id,
    reason: req.body.reason
  })
  await auditService.writeFromRequest(req, {
    module: 'certificate',
    action: 'revoke_farm_certificate',
    entityType: 'farm_certificate',
    entityId: updated.id,
    status: 'success',
    afterData: { status: updated.status }
  })
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_REVOKE_SUCCESS,
    data: updated
  })
}

// ========= PUBLIC BADGE =========
export const getFarmBadgesController = async (
  req: Request<{ farmId: string }>,
  res: Response
) => {
  const badges = await resolveFarmCertificateBadges(req.params.farmId)
  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.CERT_GET_SUCCESS,
    data: { badges: serializeBadges(badges) }
  })
}
