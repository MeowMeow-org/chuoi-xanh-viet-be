/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Farm
 *     description: Farm endpoints
 *   - name: Chatbot
 *     description: AI chatbot endpoints (farming advice, disease diagnosis, market prices)
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
 *                           enum: [consumer, farmer, cooperative, admin]
 *                           example: farmer
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
 *                       enum: [consumer, farmer, cooperative, admin]
 *                       example: farmer
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
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Page size
 *       - in: query
 *         name: searchTerm
 *         required: false
 *         schema:
 *           type: string
 *         description: Search in name, crop, province, district, address (case-insensitive)
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
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 4fdc09f4-2f69-4f1f-b631-8dc7fd50b52b
 *                           ownerUserId:
 *                             type: string
 *                             example: 9d0f27f6-8e3f-4fe0-8a0c-d9d141b4999c
 *                           name:
 *                             type: string
 *                             example: Farm Chuoi Xanh
 *                           areaHa:
 *                             type: number
 *                             nullable: true
 *                             example: 12.5
 *                           cropMain:
 *                             type: string
 *                             nullable: true
 *                             example: Banana
 *                           province:
 *                             type: string
 *                             nullable: true
 *                             example: Lam Dong
 *                           district:
 *                             type: string
 *                             nullable: true
 *                             example: Duc Trong
 *                           ward:
 *                             type: string
 *                             nullable: true
 *                             example: Hiep An
 *                           address:
 *                             type: string
 *                             nullable: true
 *                             example: 123 Village Road
 *                           latitude:
 *                             type: number
 *                             nullable: true
 *                             example: 11.94042
 *                           longitude:
 *                             type: number
 *                             nullable: true
 *                             example: 108.45831
 *                           inCooperative:
 *                             type: boolean
 *                             example: false
 *                             description: Whether the farm is a cooperative member (hop tac xa)
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     meta:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 42
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         previousPage:
 *                           type: integer
 *                           nullable: true
 *                           example: null
 *                           description: Previous page number (1-based), null if none
 *                         nextPage:
 *                           type: integer
 *                           nullable: true
 *                           example: 2
 *                           description: Next page number (1-based), null if none
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       422:
 *         description: Validation error (invalid page or limit)
 */
/**
 * @swagger
 * /v1/api/chatbot/chat:
 *   post:
 *     summary: Chat with farming assistant (VietGAP/GlobalGAP, pests, cultivation techniques)
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: Cây chuối bị vàng lá, cần xử lý thế nào?
 *               conversationHistory:
 *                 type: array
 *                 description: Previous messages for multi-turn conversation
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Chat response successful
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
 *                   example: Chatbot trả lời thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     reply:
 *                       type: string
 *                     usage:
 *                       type: object
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/chatbot/diagnose:
 *   post:
 *     summary: Diagnose plant disease via image (Vision Language Model)
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Plant image to diagnose
 *               note:
 *                 type: string
 *                 description: Optional additional note about the plant condition
 *                 example: Lá bắt đầu vàng từ 3 ngày trước
 *     responses:
 *       200:
 *         description: Diagnosis successful
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
 *                   example: Diagnose successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     diagnosis:
 *                       type: string
 *                     usage:
 *                       type: object
 *       400:
 *         description: Missing image file
 *       401:
 *         description: Access token is invalid, expired, or missing
 */

/**
 * @swagger
 * /v1/api/chatbot/market:
 *   post:
 *     summary: Query agricultural market prices
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - crop
 *             properties:
 *               crop:
 *                 type: string
 *                 example: chuối
 *               region:
 *                 type: string
 *                 description: Optional region/province to narrow down market data
 *                 example: Lâm Đồng
 *               conversationHistory:
 *                 type: array
 *                 description: Previous messages for multi-turn conversation
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: Market query successful
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
 *                   example: Tư vấn thị trường thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     advice:
 *                       type: string
 *                     crop:
 *                       type: string
 *                       example: chuối
 *                     region:
 *                       type: string
 *                       nullable: true
 *                       example: Lâm Đồng
 *                     sources:
 *                       type: array
 *                       items:
 *                         type: object
 *                     usage:
 *                       type: object
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       422:
 *         description: Validation error
 */

export {}
