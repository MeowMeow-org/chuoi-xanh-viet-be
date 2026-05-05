import type { account_status, Prisma, user_role } from '@prisma/client'
import { randomUUID } from 'crypto'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { NotificationEntityType } from '~/modules/notification/notification.constants'

const BROADCAST_BATCH_SIZE = 500

export type BroadcastAudience = 'all' | 'consumers' | 'farmers' | 'cooperatives'

class AdminService {
  async getDashboardSummary() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      usersByRole,
      usersByStatus,
      ordersByStatus,
      pendingFarmCertsAdminScope,
      usersCreatedLast7Days,
      ordersCreatedLast7Days
    ] = await Promise.all([
      prisma.users.groupBy({
        by: ['role'],
        _count: { _all: true }
      }),
      prisma.users.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.orders.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.farm_certificates.count({
        where: { approver_scope: 'admin', status: 'pending' }
      }),
      prisma.users.count({
        where: { created_at: { gte: sevenDaysAgo } }
      }),
      prisma.orders.count({
        where: { created_at: { gte: sevenDaysAgo } }
      })
    ])

    const roleCounts: Record<user_role, number> = {
      consumer: 0,
      farmer: 0,
      cooperative: 0,
      admin: 0
    }
    for (const row of usersByRole) {
      roleCounts[row.role] = row._count._all
    }

    const statusCounts: Record<account_status, number> = {
      active: 0,
      pending: 0,
      suspended: 0
    }
    for (const row of usersByStatus) {
      statusCounts[row.status] = row._count._all
    }

    const orderStatusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0
    }
    for (const row of ordersByStatus) {
      orderStatusCounts[row.status] = row._count._all
    }

    const totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0)

    return {
      users: {
        total: totalUsers,
        byRole: roleCounts,
        byStatus: statusCounts
      },
      orders: {
        byStatus: orderStatusCounts
      },
      pendingFarmCertificatesAdminScope: pendingFarmCertsAdminScope,
      last7Days: {
        newUsers: usersCreatedLast7Days,
        newOrders: ordersCreatedLast7Days
      }
    }
  }

  async listUsers(params: {
    page?: number
    limit?: number
    q?: string
    role?: user_role
    status?: account_status
  }) {
    const safePage = Math.max(1, params.page ?? 1)
    const safeLimit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (safePage - 1) * safeLimit

    const where: Prisma.usersWhereInput = {}

    if (params.role) {
      where.role = params.role
    }
    if (params.status) {
      where.status = params.status
    }

    const q = params.q?.trim()
    if (q) {
      const pattern = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
      where.OR = [
        { phone: { contains: pattern, mode: 'insensitive' } },
        { full_name: { contains: pattern, mode: 'insensitive' } },
        { email: { contains: pattern, mode: 'insensitive' } }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          phone: true,
          email: true,
          full_name: true,
          role: true,
          status: true,
          avatar_url: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.users.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)

    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  async getUserById(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        avatar_url: true,
        zalo_user_id: true,
        created_at: true,
        updated_at: true
      }
    })

    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.USER_NOT_FOUND
      })
    }

    return user
  }

  async updateUserStatus(targetUserId: string, status: 'active' | 'suspended') {
    const target = await prisma.users.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, status: true }
    })

    if (!target) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.USER_NOT_FOUND
      })
    }

    if (status === 'suspended' && target.role === 'admin' && target.status === 'active') {
      const activeAdmins = await prisma.users.count({
        where: { role: 'admin', status: 'active' }
      })
      if (activeAdmins <= 1) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: USER_MESSAGES.ADMIN_CANNOT_SUSPEND_LAST_ADMIN
        })
      }
    }

    const updated = await prisma.users.update({
      where: { id: targetUserId },
      data: { status, updated_at: new Date() },
      select: {
        id: true,
        phone: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        avatar_url: true,
        created_at: true,
        updated_at: true
      }
    })

    return updated
  }

  private audienceWhere(
    audience: BroadcastAudience
  ): Prisma.usersWhereInput | undefined {
    switch (audience) {
      case 'all':
        return { status: 'active' }
      case 'consumers':
        return { role: 'consumer', status: 'active' }
      case 'farmers':
        return { role: 'farmer', status: 'active' }
      case 'cooperatives':
        return { role: 'cooperative', status: 'active' }
      default:
        return undefined
    }
  }

  async broadcastSystemNotifications(params: {
    actorUserId: string
    title: string
    body: string
    audience: BroadcastAudience
    linkPath?: string | null
  }) {
    const { actorUserId, title, body, audience } = params
    const linkPath =
      typeof params.linkPath === 'string' && params.linkPath.trim() !== ''
        ? params.linkPath.trim()
        : null

    const where = this.audienceWhere(audience)
    if (!where) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ADMIN_BROADCAST_AUDIENCE_INVALID
      })
    }

    const recipients = await prisma.users.findMany({
      where,
      select: { id: true }
    })

    if (recipients.length === 0) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.ADMIN_BROADCAST_EMPTY_AUDIENCE
      })
    }

    const batchId = randomUUID()
    const metadata: Prisma.InputJsonValue | undefined = linkPath
      ? { linkPath, broadcastBatchId: batchId }
      : { broadcastBatchId: batchId }

    let inserted = 0

    for (let i = 0; i < recipients.length; i += BROADCAST_BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BROADCAST_BATCH_SIZE)
      const data: Prisma.user_notificationsCreateManyInput[] = chunk.map((r) => ({
        recipient_user_id: r.id,
        actor_user_id: actorUserId,
        type: 'system',
        title,
        body,
        entity_type: NotificationEntityType.SYSTEM_BROADCAST,
        entity_id: null,
        dedupe_key: `broadcast:${batchId}:${r.id}`,
        metadata
      }))

      const { count } = await prisma.user_notifications.createMany({
        data,
        skipDuplicates: true
      })
      inserted += count
    }

    return { sentCount: inserted, recipientTotal: recipients.length, batchId }
  }

  /**
   * Liệt kê các farm có `province/district/ward` (text) nhưng thiếu code chuẩn.
   * Dùng để admin fix tay sau khi backfill (script vừa chạy không match được tên).
   */
  async listFarmsMissingAddressCode(params: { page?: number; limit?: number }) {
    const safePage = Math.max(1, params.page ?? 1)
    const safeLimit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (safePage - 1) * safeLimit

    /** Coi là "thiếu" khi có name nhưng không có code tương ứng. */
    const where: Prisma.farmsWhereInput = {
      OR: [
        { AND: [{ NOT: { province: null } }, { province_code: null }] },
        { AND: [{ NOT: { district: null } }, { district_code: null }] },
        { AND: [{ NOT: { ward: null } }, { ward_code: null }] }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.farms.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          owner_user_id: true,
          name: true,
          province: true,
          district: true,
          ward: true,
          province_code: true,
          district_code: true,
          ward_code: true,
          updated_at: true
        }
      }),
      prisma.farms.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }

  /** Liệt kê các order có name shipping nhưng thiếu code (chỉ áp dụng đơn mới sau migration). */
  async listOrdersMissingAddressCode(params: { page?: number; limit?: number }) {
    const safePage = Math.max(1, params.page ?? 1)
    const safeLimit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip = (safePage - 1) * safeLimit

    const where: Prisma.ordersWhereInput = {
      OR: [
        { AND: [{ NOT: { shipping_province_name: null } }, { shipping_province_code: null }] },
        { AND: [{ NOT: { shipping_district_name: null } }, { shipping_district_code: null }] },
        { AND: [{ NOT: { shipping_ward_name: null } }, { shipping_ward_code: null }] }
      ]
    }

    const [items, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          buyer_user_id: true,
          shipping_name: true,
          shipping_phone: true,
          shipping_address: true,
          shipping_province_code: true,
          shipping_district_code: true,
          shipping_ward_code: true,
          shipping_province_name: true,
          shipping_district_name: true,
          shipping_ward_name: true,
          shipping_detail: true,
          created_at: true
        }
      }),
      prisma.orders.count({ where })
    ])

    const totalPages = Math.ceil(total / safeLimit)
    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        previousPage: safePage > 1 ? safePage - 1 : null,
        nextPage: totalPages > 0 && safePage < totalPages ? safePage + 1 : null
      }
    }
  }
}

const adminService = new AdminService()
export default adminService
