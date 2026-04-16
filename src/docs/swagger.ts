/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Farm
 *     description: Farm endpoints
 *   - name: Cooperative
 *     description: Cooperative (HTX) and farmer applicant registration
 */

/**
 * @swagger
 * /v1/api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: demo@chuoixanh.vn
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "1"
 *                         fullName:
 *                           type: string
 *                           example: Nguyen Van A
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: demo@chuoixanh.vn
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                           example: "0901234567"
 *                         role:
 *                           type: string
 *                           example: FARMER
 *                         status:
 *                           type: string
 *                           example: ACTIVE
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirm_password
 *               - full_name
 *               - phone
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: demo@chuoixanh.vn
 *               password:
 *                 type: string
 *                 example: 123456
 *               confirm_password:
 *                 type: string
 *                 example: 123456
 *               full_name:
 *                 type: string
 *                 example: Nguyen Van A
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *     responses:
 *       201:
 *         description: Register successful
 *       409:
 *         description: Email or phone already exists
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token returned from login/register
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Refresh token successful
 * /v1/api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Get current user profile successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Refresh token successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid, expired, revoked, or unknown refresh token
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token returned from login
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Logout successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Invalid, expired, or unknown refresh token
 *       422:
 *         description: Validation error
 *                   example: Get my profile successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "1"
 *                     fullName:
 *                       type: string
 *                       example: Nguyen Van A
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: demo@chuoixanh.vn
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       example: "0901234567"
 *                     role:
 *                       type: string
 *                       example: FARMER
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /v1/api/auth/forgot-password:
 *   post:
 *     summary: Send reset password email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: demo@chuoixanh.vn
 *     responses:
 *       200:
 *         description: Reset password email has been sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Check your email to reset password
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       404:
 *         description: Email is not existed
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/auth/verify-forgot-password:
 *   post:
 *     summary: Verify forgot password token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - forgot_password_token
 *             properties:
 *               forgot_password_token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Forgot password token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Verify forgot password token successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Token error messages - "Link đặt lại mật khẩu đã hết hạn" or "Link đặt lại mật khẩu không hợp lệ"
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/auth/reset-password:
 *   post:
 *     summary: Reset password with forgot password token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - forgot_password_token
 *               - password
 *               - confirm_password
 *             properties:
 *               forgot_password_token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               password:
 *                 type: string
 *                 example: NewPassword@123
 *               confirm_password:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Reset password successfully
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: Token error messages - "Link đặt lại mật khẩu đã hết hạn" or "Link đặt lại mật khẩu không hợp lệ"
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/farm:
 *   get:
 *     summary: Get all farms
 *     tags: [Farm]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *           example: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Get farms successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Get farms successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 4fdc09f4-2f69-4f1f-b631-8dc7fd50b52b
 *                       ownerUserId:
 *                         type: string
 *                         example: 9d0f27f6-8e3f-4fe0-8a0c-d9d141b4999c
 *                       name:
 *                         type: string
 *                         example: Farm Chuoi Xanh
 *                       areaHa:
 *                         type: number
 *                         nullable: true
 *                         example: 12.5
 *                       cropMain:
 *                         type: string
 *                         nullable: true
 *                         example: Banana
 *                       province:
 *                         type: string
 *                         nullable: true
 *                         example: Lam Dong
 *                       district:
 *                         type: string
 *                         nullable: true
 *                         example: Duc Trong
 *                       ward:
 *                         type: string
 *                         nullable: true
 *                         example: Hiep An
 *                       address:
 *                         type: string
 *                         nullable: true
 *                         example: 123 Village Road
 *                       latitude:
 *                         type: number
 *                         nullable: true
 *                         example: 11.94042
 *                       longitude:
 *                         type: number
 *                         nullable: true
 *                         example: 108.45831
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       422:
 *         description: Validation error (invalid page or limit)
 *   post:
 *     summary: Create new farm (farmer only)
 *     tags: [Farm]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 180
 *                 example: Farm Chuoi Xanh
 *               area_ha:
 *                 type: number
 *                 example: 2.5
 *               crop_main:
 *                 type: string
 *                 maxLength: 120
 *                 example: Banana
 *               province:
 *                 type: string
 *                 maxLength: 100
 *                 example: Lam Dong
 *               district:
 *                 type: string
 *                 maxLength: 100
 *                 example: Duc Trong
 *               ward:
 *                 type: string
 *                 maxLength: 100
 *                 example: Hiep An
 *               address:
 *                 type: string
 *                 example: 123 Village Road
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 11.94042
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 108.45831
 *               in_cooperative:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Farm created successfully
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       403:
 *         description: Only farmer accounts can perform this action
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/cooperative/htx:
 *   get:
 *     summary: List active cooperative (HTX) accounts
 *     tags: [Cooperative]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of cooperatives
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/cooperative/register-farmer-applicant:
 *   post:
 *     summary: Register as consumer with farm and pending HTX membership
 *     tags: [Cooperative]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirm_password
 *               - full_name
 *               - phone
 *               - cooperative_user_id
 *               - farm_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               confirm_password:
 *                 type: string
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               cooperative_user_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the cooperative user (HTX) to apply under
 *               farm_name:
 *                 type: string
 *                 maxLength: 180
 *     responses:
 *       201:
 *         description: Created; returns tokens and membership pending
 *       400:
 *         description: Invalid cooperative id
 *       409:
 *         description: Email or phone already exists
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/cooperative/members/{membershipId}/approve:
 *   post:
 *     summary: Approve pending membership (HTX only)
 *     tags: [Cooperative]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Approved; farmer role granted
 *       400:
 *         description: Invalid state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a cooperative account or not owner of request
 *       404:
 *         description: Membership not found
 */

/**
 * @swagger
 * /v1/api/cooperative/members/{membershipId}/reject:
 *   post:
 *     summary: Reject pending membership (HTX only)
 *     tags: [Cooperative]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rejected
 *       400:
 *         description: Invalid state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Membership not found
 */
export {}
