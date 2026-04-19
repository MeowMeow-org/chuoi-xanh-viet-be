import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import {
  cooperativeRoleValidator,
  getHtxListQueryValidator,
  joinRequestBodyValidator,
  listMyMembershipsQueryValidator,
  membershipIdParamValidator,
  rejectMembershipBodyValidator
} from './cooperative.middleware'
import {
  approveMembershipController,
  listHtxController,
  listManagedFarmSeasonsController,
  listMyMembershipsController,
  rejectMembershipController,
  requestJoinCooperativeController
} from './cooperative.controller'

const cooperativeRouter = Router()

/**
 * @desc List active cooperative (HTX) accounts for consumers to choose
 * @route GET /cooperative/htx
 * @access public
 */
cooperativeRouter.get(
  '/htx',
  getHtxListQueryValidator,
  wrapAsync(listHtxController)
)

/**
 * @desc Farmer: gửi đơn gia nhập HTX cho nông trại đã có (cooperative_members pending)
 * @route POST /cooperative/join-request
 * @access private (farmer)
 */
cooperativeRouter.post(
  '/join-request',
  accessTokenValidator,
  requireFarmer,
  joinRequestBodyValidator,
  wrapAsync(requestJoinCooperativeController)
)

/**
 * @desc List membership rows for the logged-in HTX (optional status filter)
 * @route GET /cooperative/members
 * @access private (cooperative role)
 */
cooperativeRouter.get(
  '/members',
  accessTokenValidator,
  cooperativeRoleValidator,
  listMyMembershipsQueryValidator,
  wrapAsync(listMyMembershipsController)
)

/**
 * @desc Approve pending membership (farmer becomes farmer role, farm in cooperative)
 * @route POST /cooperative/members/:membershipId/approve
 * @access private (cooperative role)
 */
cooperativeRouter.post(
  '/members/:membershipId/approve',
  accessTokenValidator,
  cooperativeRoleValidator,
  membershipIdParamValidator,
  wrapAsync(approveMembershipController)
)

/**
 * @desc Reject pending membership
 * @route POST /cooperative/members/:membershipId/reject
 * @access private (cooperative role)
 */
cooperativeRouter.post(
  '/members/:membershipId/reject',
  accessTokenValidator,
  cooperativeRoleValidator,
  membershipIdParamValidator,
  rejectMembershipBodyValidator,
  wrapAsync(rejectMembershipController)
)

/**
 * @desc List seasons of a farm this HTX is approved-member of (for inspection UI)
 * @route GET /cooperative/farms/:farmId/seasons
 * @access private (cooperative role)
 */
cooperativeRouter.get(
  '/farms/:farmId/seasons',
  accessTokenValidator,
  cooperativeRoleValidator,
  wrapAsync(listManagedFarmSeasonsController)
)

export default cooperativeRouter
