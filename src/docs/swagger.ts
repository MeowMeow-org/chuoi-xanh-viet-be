/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Farm
 *     description: Farm endpoints
 *   - name: Chatbot
 *     description: AI chatbot endpoints (farming advice, disease diagnosis, market prices)
 *   - name: Cooperative
 *     description: Cooperative (HTX) and farmer applicant registration
 *   - name: Season
 *     description: Season endpoints
 *   - name: Diary
 *     description: Diary endpoints
 *   - name: Forum
 *     description: Q&A forum posts and comments (labels whitelist; optional images from upload service)
 *   - name: Shop
 *     description: Shop (gian hàng) endpoints – CRUD, AI suggest, products
 *   - name: Upload
 *     description: Proxy image upload to IMAGE_WORKER (Bearer JWT; multipart field `images`, max 3 files)
 *   - name: Chat
 *     description: Consumer–farmer chat (REST + Socket.IO on same server, path /socket.io/)
 *   - name: AgriTrend
 *     description: Xu hướng nông nghiệp real-time (cây trồng hot, tín hiệu thị trường, công nghệ, cảnh báo)
 *   - name: ShopReview
 *     description: Đánh giá sản phẩm / shop và phân tích AI tổng hợp nhận xét
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
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       422:
 *         description: Validation error
 *
 * /v1/api/auth/register:
 *   post:
 *     summary: Register user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, confirm_password, full_name, phone, role]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               confirm_password: { type: string }
 *               full_name: { type: string }
 *               phone: { type: string }
 *               role:
 *                 type: string
 *                 enum: [consumer, farmer]
 *                 description: Ng╞░ß╗¥i ti├¬u d├╣ng (consumer) hoß║╖c N├┤ng hß╗Ö (farmer)
 *     responses:
 *       201:
 *         description: Register successful
 *       422:
 *         description: Validation error or email/phone already exists
 *
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
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Refresh token successful
 *       401:
 *         description: Invalid refresh token
 *
 * /v1/api/auth/logout:
 *   post:
 *     summary: Logout (revoke refresh token session)
 *     description: Body must include a valid, non-expired refreshToken (same verification as refresh-token).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Missing, invalid, or expired refresh token
 *
 * /v1/api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Get profile successful
 *       401:
 *         description: Unauthorized
 *
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
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Email sent
 *
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
 *             required: [forgot_password_token]
 *             properties:
 *               forgot_password_token: { type: string }
 *     responses:
 *       200:
 *         description: Token valid
 *       401:
 *         description: Invalid or expired token
 *
 * /v1/api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [forgot_password_token, password, confirm_password]
 *             properties:
 *               forgot_password_token: { type: string }
 *               password: { type: string }
 *               confirm_password: { type: string }
 *     responses:
 *       200:
 *         description: Reset password successful
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
 *
 * /v1/api/farm:
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
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 180, example: Farm Chuoi Xanh }
 *               area_ha: { type: number, example: 2.5 }
 *               crop_main: { type: string, maxLength: 120, example: Banana }
 *               province: { type: string, maxLength: 100, example: Lam Dong }
 *               district: { type: string, maxLength: 100, example: Duc Trong }
 *               ward: { type: string, maxLength: 100, example: Hiep An }
 *               address: { type: string, example: 123 Village Road }
 *               latitude: { type: number, minimum: -90, maximum: 90, example: 11.94042 }
 *               longitude: { type: number, minimum: -180, maximum: 180, example: 108.45831 }
 *               in_cooperative: { type: boolean, example: false }
 *     responses:
 *       201:
 *         description: Farm created successfully
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       403:
 *         description: Only farmer accounts can perform this action
 *       422:
 *         description: Validation error
 *
 * /v1/api/farm/{farm_id}:
 *   patch:
 *     summary: Update farm (farmer only)
 *     tags: [Farm]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farm_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 180 }
 *               area_ha: { type: number }
 *               crop_main: { type: string, maxLength: 120 }
 *               province: { type: string, maxLength: 100 }
 *               district: { type: string, maxLength: 100 }
 *               ward: { type: string, maxLength: 100 }
 *               address: { type: string }
 *               latitude: { type: number, minimum: -90, maximum: 90 }
 *               longitude: { type: number, minimum: -180, maximum: 180 }
 *               in_cooperative: { type: boolean }
 *     responses:
 *       200:
 *         description: Farm updated successfully
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       403:
 *         description: Farm not found or forbidden
 *       422:
 *         description: Validation error
 *   delete:
 *     summary: Delete farm (farmer only)
 *     tags: [Farm]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farm_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Farm deleted successfully
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       403:
 *         description: Farm not found or forbidden
 *       409:
 *         description: Farm has related data and cannot be deleted
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
 *         description: Token error messages - "Link ─æß║╖t lß║íi mß║¡t khß║⌐u ─æ├ú hß║┐t hß║ín" or "Link ─æß║╖t lß║íi mß║¡t khß║⌐u kh├┤ng hß╗úp lß╗ç"
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
 *         description: Token error messages - "Link ─æß║╖t lß║íi mß║¡t khß║⌐u ─æ├ú hß║┐t hß║ín" or "Link ─æß║╖t lß║íi mß║¡t khß║⌐u kh├┤ng hß╗úp lß╗ç"
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
 *
 * /v1/api/farm/mine:
 *   get:
 *     summary: Get farms owned by the current user
 *     description: Returns farms where ownerUserId matches the access token user_id (pagination and search same as GET /farm).
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
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: searchTerm
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Get my farms successfully
 *       401:
 *         description: Access token is invalid, expired, or missing
 *       422:
 *         description: Validation error
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
 *     description: |
 *       Ưu tiên **message** (nội dung chat). Tìm kiếm web và trả lời GPT dựa trên câu hỏi thực tế.
 *       **crop** (ô gợi ý) chỉ là bối cảnh thêm khi khác với message. Bắt buộc có ít nhất message hoặc crop.
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Câu hỏi / chat của người dùng — luôn ưu tiên (vd. "giá cà rốt hôm nay")
 *                 example: giá cà rốt bao nhiêu
 *               crop:
 *                 type: string
 *                 description: Gợi ý từ biểu mẫu (tuỳ chọn); thêm ngữ cảnh nếu khác message
 *                 example: Bưởi
 *               region:
 *                 type: string
 *                 description: Khu vực (tuỳ chọn)
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
 *                     message:
 *                       type: string
 *                       description: Nội dung câu hỏi đã dùng (message hoặc crop)
 *                     crop:
 *                       type: string
 *                       nullable: true
 *                       description: Giá trị ô gợi ý nếu có
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
 *         description: Validation error or missing both message and crop
 */

/**
 * @swagger
 * /v1/api/season:
 *   post:
 *     summary: Create season
 *     tags: [Season]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [farmId, cropName, startDate, estimatedYield]
 *             properties:
 *               farmId: { type: string, format: uuid }
 *               code: { type: string, description: 'Optional; server generates 6 letters + 6 digits if omitted', example: ABCDEF042891 }
 *               cropName: { type: string, example: Chuoi Nam My }
 *               startDate: { type: string, format: date, example: '2026-04-15' }
 *               harvestStartDate: { type: string, format: date, nullable: true }
 *               harvestEndDate: { type: string, format: date, nullable: true }
 *               estimatedYield: { type: number, example: 1500, description: 'Required; must be > 0' }
 *               actualYield: { type: number, nullable: true, example: 1400 }
 *               yieldUnit: { type: string, nullable: true, example: kg }
 *     responses:
 *       201:
 *         description: Create season successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Farm not found or forbidden
 *       422:
 *         description: Validation error
 *   get:
 *     summary: Get seasons (with pagination)
 *     tags: [Season]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: searchTerm
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, ready_to_anchor, anchored, amended, failed] }
 *       - in: query
 *         name: farmId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Get seasons successfully
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/season/{season_id}:
 *   get:
 *     summary: Get season detail
 *     tags: [Season]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: season_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Get season detail successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Season not found
 *   patch:
 *     summary: Update season
 *     tags: [Season]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: season_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               cropName: { type: string }
 *               startDate: { type: string, format: date }
 *               harvestStartDate: { type: string, format: date, nullable: true }
 *               harvestEndDate: { type: string, format: date, nullable: true }
 *               estimatedYield: { type: number, nullable: true }
 *               actualYield: { type: number, nullable: true }
 *               yieldUnit: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Update season successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Season not found
 *       409:
 *         description: Season is anchored, cannot update base information
 *   delete:
 *     summary: Delete season
 *     tags: [Season]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: season_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Delete season successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Season not found
 *       409:
 *         description: Season has related data, cannot be deleted
 */

/**
 * @swagger
 * /v1/api/season/{season_id}/status:
 *   patch:
 *     summary: Change season status
 *     tags: [Season]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: season_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, ready_to_anchor, anchored, amended, failed]
 *                 example: ready_to_anchor
 *     responses:
 *       200:
 *         description: Change season status successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Season not found
 *       409:
 *         description: Invalid season status transition
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/diary:
 *   post:
 *     summary: Create diary entry
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seasonId, farmId, eventType, eventDate]
 *             properties:
 *               seasonId: { type: string, format: uuid }
 *               farmId: { type: string, format: uuid }
 *               eventType: { type: string, enum: [land_prep, sowing, fertilizing, pesticide, irrigation, harvesting, packing, other] }
 *               eventDate: { type: string, format: date }
 *               description: { type: string, nullable: true }
 *               extraData: { type: object, nullable: true }
 *     responses:
 *       201:
 *         description: Create diary successfully
 *   get:
 *     summary: Get diary entries
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: seasonId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: farmId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: eventType
 *         schema: { type: string, enum: [land_prep, sowing, fertilizing, pesticide, irrigation, harvesting, packing, other] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: Get diaries successfully
 */

/**
 * @swagger
 * /v1/api/diary/{diary_id}/attachments:
 *   post:
 *     summary: Add diary attachment (file URL after client upload)
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: diary_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileUrl]
 *             properties:
 *               fileUrl: { type: string, maxLength: 4096, example: 'https://cdn.example.com/evidence/photo.jpg' }
 *               mimeType: { type: string, nullable: true, example: 'image/jpeg' }
 *               sortOrder: { type: integer, minimum: 0, default: 0 }
 *               meta: { type: object, nullable: true }
 *     responses:
 *       201:
 *         description: Attachment created
 *       409:
 *         description: Season is anchored, cannot modify diary
 *       422:
 *         description: Validation error
 */

/**
 * @swagger
 * /v1/api/diary/{diary_id}/attachments/{attachment_id}:
 *   delete:
 *     summary: Delete diary attachment
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: diary_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: attachment_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Attachment deleted
 *       404:
 *         description: Attachment not found
 *       409:
 *         description: Season is anchored, cannot modify diary
 */

/**
 * @swagger
 * /v1/api/diary/{diary_id}:
 *   get:
 *     summary: Get diary detail
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: diary_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Get diary detail successfully (includes attachments array)
 *       404:
 *         description: Diary not found
 *   patch:
 *     summary: Update diary entry
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: diary_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType: { type: string, enum: [land_prep, sowing, fertilizing, pesticide, irrigation, harvesting, packing, other] }
 *               eventDate: { type: string, format: date }
 *               description: { type: string, nullable: true }
 *               extraData: { type: object, nullable: true }
 *     responses:
 *       200:
 *         description: Update diary successfully
 *       409:
 *         description: Season is anchored, cannot update diary
 *   delete:
 *     summary: Delete diary entry
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: diary_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Delete diary successfully
 *       409:
 *         description: Season is anchored, cannot delete diary
 */

/**
 * @swagger
 * /v1/api/diary/scan/{season_id}:
 *   post:
 *     summary: AI scan diary entries of a season for violations
 *     description: |
 *       Dùng OpenAI để quét toàn bộ nhật ký canh tác của một vụ mùa và phát hiện các vi phạm:
 *       - **BANNED_PESTICIDE**: Sử dụng thuốc BVTV bị cấm (Carbofuran, Paraquat, ...)
 *       - **PHI_VIOLATION**: Phun thuốc quá gần ngày thu hoạch (< 14 ngày)
 *       - **SEQUENCE_VIOLATION**: Sai trình tự kỹ thuật (thu hoạch trước khi gieo hạt, ...)
 *       - **EXCESSIVE_PESTICIDE_FREQUENCY**: Phun thuốc quá nhiều lần trong thời gian ngắn
 *       - **SUSPICIOUS_DIARY_PATTERN**: Dấu hiệu nhập liệu gian lận (backdating)
 *       - **MISSING_KEY_ACTIVITY**: Thiếu bước kỹ thuật quan trọng
 *
 *       Kết quả được tự động lưu vào nhật ký (event_type=other) nếu vụ mùa chưa anchored.
 *     tags: [Diary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: season_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: ID của vụ mùa cần kiểm tra
 *     responses:
 *       200:
 *         description: Kiểm tra nhật ký AI thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Kiểm tra nhật ký AI thành công }
 *                 data:
 *                   type: object
 *                   properties:
 *                     seasonId: { type: string, format: uuid }
 *                     scannedAt: { type: string, format: date-time }
 *                     overallRisk:
 *                       type: string
 *                       enum: [safe, warning, critical]
 *                       description: safe = không có vấn đề, warning = cần chú ý, critical = vi phạm nghiêm trọng
 *                     violations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           severity: { type: string, enum: [info, warning, critical] }
 *                           code: { type: string, example: BANNED_PESTICIDE }
 *                           title: { type: string, example: Sử dụng thuốc BVTV bị cấm }
 *                           detail: { type: string }
 *                           relatedEntryIds:
 *                             type: array
 *                             items: { type: string, format: uuid }
 *                           recommendation: { type: string }
 *                     summary: { type: string, description: Tóm tắt kết quả bằng tiếng Việt }
 *       400:
 *         description: Vụ mùa chưa có nhật ký canh tác để kiểm tra
 *       403:
 *         description: Không có quyền truy cập vụ mùa này
 *       404:
 *         description: Không tìm thấy vụ mùa
 *       422:
 *         description: season_id không phải UUID hợp lệ
 *       500:
 *         description: OpenAI API lỗi
 */

/**
 * @swagger
 * /v1/api/upload:
 *   post:
 *     summary: Upload images (proxy to image worker)
 *     description: |
 *       Multipart form field **`images`** (repeat for multiple files, max 3 per request, ~12MB each).
 *       Requires `IMAGE_WORKER_SERVICE_API` and `IMAGE_WORKER_SERVICE_KEY` on the server.
 *       Response `data.items[].forumImage` is ready to paste into `POST /v1/api/forum/posts` body as `images`.
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Each file uploaded; worker JSON plus forumImage helper
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           success: { type: boolean }
 *                           url: { type: string, format: uri }
 *                           thumb: { type: string, format: uri }
 *                           id: { type: string, format: uuid }
 *                           size: { type: number }
 *                           aspect_ratio: { type: number }
 *                           forumImage:
 *                             type: object
 *                             properties:
 *                               objectKey: { type: string, description: Worker file id ΓÇö store as objectKey }
 *                               url: { type: string, format: uri }
 *       400:
 *         description: No files
 *       401:
 *         description: Unauthorized
 *       502:
 *         description: Image worker error or invalid response
 *
 * /v1/api/forum/posts:
 *   get:
 *     summary: List forum posts (active only, newest first by created_at)
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: label
 *         description: Filter by label slug (whitelist)
 *         schema:
 *           type: string
 *           enum:
 *             [ky-thuat-trong, phan-bon, sau-benh, tuoi-nuoc, thu-hoach, bao-quan, thi-truong, khac]
 *       - in: query
 *         name: searchTerm
 *         schema: { type: string, maxLength: 200 }
 *     responses:
 *       200:
 *         description: Paginated posts
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create forum post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, labels]
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 220 }
 *               content: { type: string, minLength: 1, maxLength: 20000 }
 *               labels:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   enum:
 *                     [ky-thuat-trong, phan-bon, sau-benh, tuoi-nuoc, thu-hoach, bao-quan, thi-truong, khac]
 *               images:
 *                 type: array
 *                 maxItems: 3
 *                 description: Optional; use objectKey + url from POST /v1/api/upload response (forumImage)
 *                 items:
 *                   type: object
 *                   required: [objectKey, url]
 *                   properties:
 *                     objectKey: { type: string, maxLength: 2048 }
 *                     url: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: Post created (response includes images array with ids)
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 *
 * /v1/api/forum/posts/{post_id}/comments:
 *   get:
 *     summary: List comments on a post
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated comments
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *   post:
 *     summary: Add comment (blocked if post locked)
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 10000 }
 *     responses:
 *       201:
 *         description: Comment created
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       409:
 *         description: Post locked
 *       422:
 *         description: Validation error
 *
 * /v1/api/forum/posts/{post_id}:
 *   get:
 *     summary: Get forum post detail (hidden visible to author or admin)
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Post detail
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update post (author or admin; status only admin)
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, minLength: 1, maxLength: 220 }
 *               content: { type: string, minLength: 1, maxLength: 20000 }
 *               labels:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   enum:
 *                     [ky-thuat-trong, phan-bon, sau-benh, tuoi-nuoc, thu-hoach, bao-quan, thi-truong, khac]
 *               images:
 *                 type: array
 *                 maxItems: 3
 *                 description: Replaces all post images; omit to leave unchanged; [] clears images
 *                 items:
 *                   type: object
 *                   required: [objectKey, url]
 *                   properties:
 *                     objectKey: { type: string, maxLength: 2048 }
 *                     url: { type: string, format: uri }
 *               status:
 *                 type: string
 *                 enum: [active, hidden, locked]
 *     responses:
 *       200:
 *         description: Updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       422:
 *         description: Validation error
 *   delete:
 *     summary: Delete post (author or admin)
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: post_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *
 * /v1/api/forum/comments/{comment_id}:
 *   patch:
 *     summary: Update own comment
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: comment_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 10000 }
 *     responses:
 *       200:
 *         description: Updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       422:
 *         description: Validation error
 *   delete:
 *     summary: Delete comment (author or admin)
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: comment_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
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
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: searchTerm
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of cooperatives
 *       422:
 *         description: Validation error
 *
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
 *         schema: { type: string, format: uuid }
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
 *
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
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note: { type: string }
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
 *
 * /v1/api/chat/conversations:
 *   post:
 *     summary: Create or get 1-1 conversation with another user (any role; valid access token)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [peerUserId]
 *             properties:
 *               peerUserId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Existing conversation (same consumerΓÇôfarmer pair)
 *       201:
 *         description: New conversation created
 *       400:
 *         description: Invalid peer (inactive or self)
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: List my chat conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         description: Unauthorized
 *
 * /v1/api/chat/conversations/{conversationId}/messages:
 *   get:
 *     summary: Paginated messages (oldest first in page)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Messages + meta
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not a participant
 *   post:
 *     summary: Send message (HTTP fallback; Socket event chat:send also available)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 8000 }
 *     responses:
 *       201:
 *         description: Message created; other clients get chat:message via Socket.IO
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not a participant
 */
/**
 * @swagger
 * /v1/api/shop/suggest:
 *   get:
 *     summary: AI-suggest shop name & description based on farm info
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farm_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Farm ID to generate suggestion for
 *     responses:
 *       200:
 *         description: Shop suggestion generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: number, example: 200 }
 *                 message: { type: string, example: Shop suggestion generated successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestedName: { type: string, example: Nh├á V╞░ß╗¥n Chuß╗æi Xanh L├óm ─Éß╗ông }
 *                     suggestedDescription: { type: string, example: Gian h├áng n├┤ng sß║ún sß║ích tß╗½ v├╣ng ─æß║Ñt L├óm ─Éß╗ông... }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Farm not found or forbidden
 *       500:
 *         description: AI generation failed
 *
 * /v1/api/shop:
 *   post:
 *     summary: Create shop for a farm (farmer only)
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [farm_id, name]
 *             properties:
 *               farm_id: { type: string, format: uuid }
 *               name: { type: string, maxLength: 180, example: Nh├á V╞░ß╗¥n Chuß╗æi Xanh }
 *               description: { type: string, example: Gian h├áng n├┤ng sß║ún sß║ích... }
 *     responses:
 *       201:
 *         description: Shop created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Farm not found or forbidden
 *       409:
 *         description: This farm already has a shop
 *       422:
 *         description: Validation error
 *   get:
 *     summary: Get shops (open only, search, province filter, pagination)
 *     description: |
 *       Chỉ gian hàng status=open. Sắp xếp: điểm sao TB → số đánh giá → đã xác minh → mới hơn → số sản phẩm đang bán.
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: searchTerm
 *         schema: { type: string }
 *         description: Search in shop name, description, farm province/district
 *       - in: query
 *         name: province
 *         schema: { type: string }
 *         description: Filter by farm province (e.g. same as product marketplace regions)
 *     responses:
 *       200:
 *         description: Get shops successfully
 *       401:
 *         description: Unauthorized
 *
 * /v1/api/shop/mine:
 *   get:
 *     summary: Get shops owned by the current farmer
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Get my shops successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only farmer accounts can perform this action
 *
 * /v1/api/shop/available-seasons:
 *   get:
 *     summary: List farmer's seasons (legacy; product listing uses sale units)
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available seasons retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only farmer accounts can perform this action
 *
 * /v1/api/shop/{shop_id}/available-sale-units:
 *   get:
 *     summary: List sale lots (QR) on the shop's farm that can still be listed
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Available sale units retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Shop not found or forbidden
 *
 * /v1/api/shop/{shop_id}:
 *   get:
 *     summary: Get shop detail
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Get shop detail successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *   patch:
 *     summary: Update shop (farmer only, owner)
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 180 }
 *               description: { type: string }
 *               status: { type: string, enum: [open, closed, suspended] }
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Shop not found or forbidden
 *       422:
 *         description: Validation error
 *
 * /v1/api/shop/{shop_id}/products:
 *   post:
 *     summary: Add product to shop from a parcelled sale lot (farmer only)
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sale_unit_id, price]
 *             properties:
 *               sale_unit_id: { type: string, format: uuid, description: Active sale unit on the same farm as the shop; not already listed }
 *               name: { type: string, maxLength: 180, description: Optional; default name from lot code }
 *               description: { type: string, example: Chuß╗æi sß║ích tß╗½ v╞░ß╗¥n... }
 *               price: { type: number, example: 25000 }
 *               unit: { type: string, description: Optional; defaults to lot unit }
 *               stock_qty: { type: number, description: Optional; defaults to lot quantity }
 *               image_url: { type: string, nullable: true, description: From POST /upload }
 *     responses:
 *       201:
 *         description: Product added successfully (address + trace URL auto-appended to description)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Shop or sale unit not valid for this farmer
 *       409:
 *         description: Sale unit already listed
 *       422:
 *         description: Validation error
 *   get:
 *     summary: List products in a shop
 *     description: |
 *       Sắp xếp theo điểm tổng hợp rank_score (0–1).
 *       Công thức: 0.4×độ mới đăng + 0.4×điểm sao TB + 0.2×lượt scan (trace) chuẩn hoá trong danh sách.
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Products retrieved successfully (sorted by rank_score)
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /v1/api/agri-trend:
 *   get:
 *     summary: Lấy xu hướng nông nghiệp real-time (cây trồng hot, tín hiệu thị trường, công nghệ mới, cảnh báo)
 *     description: |
 *       Phân tích tin tức RSS nông nghiệp bằng AI và trả về:
 *       - **hotCrops**: Danh sách cây trồng đang được chú ý (trendScore, sentiment, lý do, nguồn dẫn chứng)
 *       - **marketSignals**: Tín hiệu cung-cầu, cảnh báo giá
 *       - **techSpotlight**: Công nghệ / kỹ thuật nông nghiệp nổi bật
 *       - **alerts**: Cảnh báo dịch bệnh, thời tiết, giá, chính sách
 *
 *       Kết quả được cache 6 giờ. Thêm `?refresh=true` để bỏ qua cache và lấy dữ liệu mới ngay.
 *     tags: [AgriTrend]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         schema: { type: boolean }
 *         description: Bỏ qua cache, lấy dữ liệu mới ngay (dùng khi cần thiết)
 *     responses:
 *       200:
 *         description: Lấy xu hướng nông nghiệp thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: number, example: 200 }
 *                 message: { type: string, example: Lấy xu hướng nông nghiệp thành công }
 *                 data:
 *                   type: object
 *                   properties:
 *                     generatedAt: { type: string, format: date-time }
 *                     cacheExpiresAt: { type: string, format: date-time }
 *                     summary: { type: string, description: Tóm tắt tổng quan bằng tiếng Việt }
 *                     totalArticlesAnalyzed: { type: integer, example: 42 }
 *                     hotCrops:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name: { type: string, example: Chuối }
 *                           trendScore: { type: number, minimum: 0, maximum: 10, example: 8.5 }
 *                           sentiment:
 *                             type: string
 *                             enum: [positive, negative, neutral]
 *                           reason: { type: string }
 *                           evidence:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 title: { type: string }
 *                                 url: { type: string, format: uri }
 *                                 source: { type: string }
 *                                 publishedAt: { type: string, format: date-time }
 *                     marketSignals:
 *                       type: object
 *                       properties:
 *                         supplyPressure: { type: string }
 *                         demandSignals: { type: string }
 *                         priceAlerts:
 *                           type: array
 *                           items: { type: string }
 *                         evidence:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               title: { type: string }
 *                               url: { type: string, format: uri }
 *                               source: { type: string }
 *                               publishedAt: { type: string, format: date-time }
 *                     techSpotlight:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title: { type: string }
 *                           summary: { type: string }
 *                           impact: { type: string }
 *                           evidence:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 title: { type: string }
 *                                 url: { type: string, format: uri }
 *                                 source: { type: string }
 *                                 publishedAt: { type: string, format: date-time }
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [disease, weather, price, policy]
 *                           severity:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           message: { type: string }
 *                           evidence:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 title: { type: string }
 *                                 url: { type: string, format: uri }
 *                                 source: { type: string }
 *                                 publishedAt: { type: string, format: date-time }
 *       401:
 *         description: Access token không hợp lệ hoặc thiếu
 *       500:
 *         description: Lỗi AI hoặc không lấy được dữ liệu RSS
 */

/**
 * @swagger
 * /v1/api/review:
 *   post:
 *     summary: Tạo đánh giá sản phẩm sau khi đơn đã giao (consumer only, mỗi dòng sản phẩm tối đa 1 đánh giá)
 *     tags: [ShopReview]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id, product_id, rating]
 *             properties:
 *               order_id: { type: string, format: uuid, description: ID đơn hàng đã giao }
 *               product_id: { type: string, format: uuid, description: ID sản phẩm trong đơn }
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment: { type: string, nullable: true, maxLength: 2000, example: Sản phẩm tươi ngon, giao hàng nhanh }
 *     responses:
 *       201:
 *         description: Tạo đánh giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 201 }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     userId: { type: string, format: uuid }
 *                     shopId: { type: string, format: uuid }
 *                     productId: { type: string, format: uuid }
 *                     rating: { type: integer, example: 4 }
 *                     comment: { type: string, nullable: true }
 *                     isVerifiedPurchase: { type: boolean }
 *                     createdAt: { type: string, format: date-time }
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ consumer mới được đánh giá
 *       409:
 *         description: Đã đánh giá sản phẩm này rồi
 *       422:
 *         description: Validation error
 *
 * /v1/api/review/shop/{shop_id}:
 *   get:
 *     summary: Danh sách đánh giá theo shop (phân trang + điểm TB; public)
 *     tags: [ShopReview]
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách đánh giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           userId: { type: string, format: uuid }
 *                           shopId: { type: string, format: uuid }
 *                           productId: { type: string, format: uuid }
 *                           rating: { type: integer }
 *                           comment: { type: string, nullable: true }
 *                           isVerifiedPurchase: { type: boolean }
 *                           createdAt: { type: string, format: date-time }
 *                           reviewer:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               fullName: { type: string }
 *                               avatarUrl: { type: string, nullable: true }
 *                           product:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               imageUrl: { type: string, nullable: true }
 *                     meta:
 *                       type: object
 *                       properties:
 *                         page: { type: integer }
 *                         limit: { type: integer }
 *                         total: { type: integer }
 *                         totalPages: { type: integer }
 *                         averageRating: { type: number, nullable: true, example: 4.3 }
 *       422:
 *         description: shop_id không hợp lệ
 *
 * /v1/api/review/product/{product_id}:
 *   get:
 *     summary: Danh sách đánh giá theo sản phẩm (phân trang + điểm TB; public)
 *     tags: [ShopReview]
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Danh sách đánh giá thành công
 *       422:
 *         description: product_id không hợp lệ
 *
 * /v1/api/review/{review_id}:
 *   patch:
 *     summary: Sửa đánh giá của chính mình (consumer only)
 *     tags: [ShopReview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: review_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment: { type: string, nullable: true, maxLength: 2000 }
 *     responses:
 *       200:
 *         description: Cập nhật đánh giá thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải đánh giá của bạn hoặc không có quyền
 *       404:
 *         description: Không tìm thấy đánh giá
 *       422:
 *         description: Validation error
 *
 * /v1/api/review/product/{product_id}/summary:
 *   post:
 *     summary: Farmer kích hoạt phân tích AI cho nhận xét của một sản phẩm (tạo/ghi đè)
 *     tags: [ShopReview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Phân tích AI thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId: { type: string, format: uuid }
 *                     totalReviews: { type: integer }
 *                     averageRating: { type: number }
 *                     summary: { type: string, description: Tóm tắt tổng quan bằng tiếng Việt }
 *                     strengths:
 *                       type: array
 *                       items: { type: string }
 *                     weaknesses:
 *                       type: array
 *                       items: { type: string }
 *                     suggestions:
 *                       type: array
 *                       items: { type: string }
 *                     analyzedAt: { type: string, format: date-time }
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ farmer mới có quyền / sản phẩm không thuộc shop của bạn
 *       404:
 *         description: Không tìm thấy sản phẩm hoặc chưa có đánh giá nào
 *       422:
 *         description: product_id không hợp lệ
 *   get:
 *     summary: Lấy kết quả phân tích AI đã lưu cho sản phẩm (farmer only)
 *     tags: [ShopReview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lấy kết quả phân tích thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ farmer mới có quyền / sản phẩm không thuộc shop của bạn
 *       404:
 *         description: Chưa có kết quả phân tích, hãy gọi POST trước
 *       422:
 *         description: product_id không hợp lệ
 *
 * /v1/api/review/shop/{shop_id}/summary:
 *   post:
 *     summary: Farmer kích hoạt phân tích AI cho toàn bộ nhận xét của shop (tạo/ghi đè)
 *     tags: [ShopReview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Phân tích AI thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode: { type: integer, example: 200 }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     shopId: { type: string, format: uuid }
 *                     totalReviews: { type: integer }
 *                     averageRating: { type: number }
 *                     summary: { type: string, description: Tóm tắt tổng quan bằng tiếng Việt }
 *                     strengths:
 *                       type: array
 *                       items: { type: string }
 *                     weaknesses:
 *                       type: array
 *                       items: { type: string }
 *                     suggestions:
 *                       type: array
 *                       items: { type: string }
 *                     analyzedAt: { type: string, format: date-time }
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ farmer mới có quyền / shop không thuộc về bạn
 *       404:
 *         description: Không tìm thấy shop hoặc chưa có đánh giá nào
 *       422:
 *         description: shop_id không hợp lệ
 *   get:
 *     summary: Lấy kết quả phân tích AI đã lưu cho shop (farmer only)
 *     tags: [ShopReview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lấy kết quả phân tích thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ farmer mới có quyền / shop không thuộc về bạn
 *       404:
 *         description: Chưa có kết quả phân tích, hãy gọi POST trước
 *       422:
 *         description: shop_id không hợp lệ
 */

export {}
