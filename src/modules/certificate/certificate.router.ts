import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import {
  accessTokenValidator,
  requireAdmin,
  requireCooperative,
  requireCooperativeOrAdmin,
  requireFarmer
} from '../auth/auth.middleware'
import {
  certIdParamValidator,
  createCoopCertValidator,
  createFarmCertValidator,
  farmIdParamValidator,
  listQueryValidator,
  rejectBodyValidator,
  revokeBodyValidator,
  scopeAddBodyValidator,
  scopeBrowseQueryValidator,
  updateCoopCertValidator
} from './certificate.middleware'
import {
  addScopeFarmController,
  approveFarmCertController,
  createCoopCertController,
  createFarmCertController,
  deleteCoopCertController,
  getFarmBadgesController,
  listMyCoopCertsController,
  listMyFarmCertsController,
  listPendingFarmCertsForAdminController,
  listPendingFarmCertsForCoopController,
  listEligibleMembersForScopeController,
  listScopeOfCertController,
  rejectFarmCertController,
  removeScopeFarmController,
  revokeCoopCertController,
  revokeFarmCertController,
  updateCoopCertController
} from './certificate.controller'

const certificateRouter = Router()

/* ============ COOPERATIVE CERTIFICATES ============ */

// Public-ish (dùng cho trang shop/farm): lấy badge hiệu lực của một farm
certificateRouter.get(
  '/farm/:farmId/badges',
  farmIdParamValidator,
  wrapAsync(getFarmBadgesController)
)

// HTX: CRUD chứng chỉ của chính mình
certificateRouter.post(
  '/cooperative',
  accessTokenValidator,
  requireCooperative,
  createCoopCertValidator,
  wrapAsync(createCoopCertController)
)

certificateRouter.get(
  '/cooperative/mine',
  accessTokenValidator,
  requireCooperative,
  listQueryValidator,
  wrapAsync(listMyCoopCertsController)
)

certificateRouter.patch(
  '/cooperative/:certificateId',
  accessTokenValidator,
  requireCooperative,
  certIdParamValidator,
  updateCoopCertValidator,
  wrapAsync(updateCoopCertController)
)

certificateRouter.delete(
  '/cooperative/:certificateId',
  accessTokenValidator,
  requireCooperative,
  certIdParamValidator,
  wrapAsync(deleteCoopCertController)
)

// Admin: vô hiệu hóa chứng chỉ HTX
certificateRouter.post(
  '/cooperative/:certificateId/revoke',
  accessTokenValidator,
  requireAdmin,
  certIdParamValidator,
  revokeBodyValidator,
  wrapAsync(revokeCoopCertController)
)

// HTX: nông hộ đã duyệt chưa nằm trong danh sách thừa hưởng chứng chỉ này (phân trang + tìm)
certificateRouter.get(
  '/cooperative/:certificateId/eligible-members',
  accessTokenValidator,
  requireCooperative,
  certIdParamValidator,
  scopeBrowseQueryValidator,
  wrapAsync(listEligibleMembersForScopeController)
)

// HTX: danh sách nông hộ được thừa hưởng chứng chỉ (phân trang + tìm)
certificateRouter.get(
  '/cooperative/:certificateId/scope',
  accessTokenValidator,
  requireCooperative,
  certIdParamValidator,
  scopeBrowseQueryValidator,
  wrapAsync(listScopeOfCertController)
)

certificateRouter.post(
  '/cooperative/:certificateId/scope',
  accessTokenValidator,
  requireCooperative,
  certIdParamValidator,
  scopeAddBodyValidator,
  wrapAsync(addScopeFarmController)
)

certificateRouter.delete(
  '/cooperative/:certificateId/scope/:farmId',
  accessTokenValidator,
  requireCooperative,
  certIdParamValidator,
  farmIdParamValidator,
  wrapAsync(removeScopeFarmController)
)

/* ============ FARM CERTIFICATES ============ */

// Farmer: nộp chứng chỉ cho farm của mình (BE tự route duyệt HTX/admin)
certificateRouter.post(
  '/farm',
  accessTokenValidator,
  requireFarmer,
  createFarmCertValidator,
  wrapAsync(createFarmCertController)
)

// Farmer: list chứng chỉ của mình
certificateRouter.get(
  '/farm/mine',
  accessTokenValidator,
  requireFarmer,
  listQueryValidator,
  wrapAsync(listMyFarmCertsController)
)

// HTX: chờ duyệt (farm thành viên nộp)
certificateRouter.get(
  '/farm/pending/cooperative',
  accessTokenValidator,
  requireCooperative,
  listQueryValidator,
  wrapAsync(listPendingFarmCertsForCoopController)
)

// Admin: chờ duyệt (farm độc lập nộp)
certificateRouter.get(
  '/farm/pending/admin',
  accessTokenValidator,
  requireAdmin,
  listQueryValidator,
  wrapAsync(listPendingFarmCertsForAdminController)
)

// HTX hoặc admin duyệt (service kiểm tra scope)
certificateRouter.post(
  '/farm/:certificateId/approve',
  accessTokenValidator,
  requireCooperativeOrAdmin,
  certIdParamValidator,
  wrapAsync(approveFarmCertController)
)

certificateRouter.post(
  '/farm/:certificateId/reject',
  accessTokenValidator,
  requireCooperativeOrAdmin,
  certIdParamValidator,
  rejectBodyValidator,
  wrapAsync(rejectFarmCertController)
)

// Admin: vô hiệu hóa farm cert đã approved
certificateRouter.post(
  '/farm/:certificateId/revoke',
  accessTokenValidator,
  requireAdmin,
  certIdParamValidator,
  revokeBodyValidator,
  wrapAsync(revokeFarmCertController)
)

export default certificateRouter
