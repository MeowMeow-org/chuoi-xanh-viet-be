/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Farm
 *     description: Farm endpoints
 *   - name: Season
 *     description: Season endpoints
 *   - name: Diary
 *     description: Diary endpoints
 *   - name: Anchor
 *     description: Canonical payload and anchoring endpoints
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
 *             required: [email, password, confirm_password, full_name, phone]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               confirm_password: { type: string }
 *               full_name: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Register successful
 *       409:
 *         description: Email or phone already exists
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
 *     summary: Logout
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
 *             required: [farmId, code, cropName, startDate]
 *             properties:
 *               farmId: { type: string, format: uuid }
 *               code: { type: string, example: SSN-2026-001 }
 *               cropName: { type: string, example: Chuoi Nam My }
 *               startDate: { type: string, format: date, example: '2026-04-15' }
 *               harvestStartDate: { type: string, format: date, nullable: true }
 *               harvestEndDate: { type: string, format: date, nullable: true }
 *               estimatedYield: { type: number, nullable: true, example: 1500 }
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
 * /v1/api/anchor/season/{season_id}/canonical-payload:
 *   get:
 *     summary: Preview canonical payload and SHA-256 hash for season
 *     tags: [Anchor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: season_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Canonical payload preview generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (role mismatch)
 *       404:
 *         description: Season not found
 *       422:
 *         description: Validation error
 */
export {}
