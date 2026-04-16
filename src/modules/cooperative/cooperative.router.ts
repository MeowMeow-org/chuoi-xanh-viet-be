import { Router } from 'express'
import { wrapAsync } from '~/utils/handler'
import { accessTokenValidator } from '../auth/auth.middleware'
import {
  cooperativeRoleValidator,
  getHtxListQueryValidator,
  membershipIdParamValidator,
  registerFarmerApplicantValidator,
  rejectMembershipBodyValidator
} from './cooperative.middleware'
import {
  approveMembershipController,
  listHtxController,
  registerFarmerApplicantController,
  rejectMembershipController
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
 * @desc Register as consumer with a farm and pending membership under chosen HTX
 * @route POST /cooperative/register-farmer-applicant
 * @access public
 */
cooperativeRouter.post(
  '/register-farmer-applicant',
  registerFarmerApplicantValidator,
  wrapAsync(registerFarmerApplicantController)
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

export default cooperativeRouter
