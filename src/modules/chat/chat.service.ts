import type { account_status } from '@prisma/client'
import { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'

const participantSelect = {
  id: true,
  full_name: true,
  phone: true,
  role: true
} as const

const conversationInclude = {
  participant_1: { select: participantSelect },
  participant_2: { select: participantSelect }
} as const

/** Hai UUID một thread: participant_1 luôn < participant_2 (chuỗi) để khớp DB CHECK. */
export function sortParticipantIds(userIdA: string, userIdB: string): [string, string] {
  if (userIdA === userIdB) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.BAD_REQUEST,
      message: USER_MESSAGES.CHAT_PEER_INVALID
    })
  }
  return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA]
}

export function mapConversationRow(row: {
  id: string
  participant_1_id: string
  participant_2_id: string
  updated_at: Date
  created_at: Date
  participant_1: { id: string; full_name: string; phone: string; role: string }
  participant_2: { id: string; full_name: string; phone: string; role: string }
}) {
  return {
    id: row.id,
    participant1UserId: row.participant_1_id,
    participant2UserId: row.participant_2_id,
    participant1: {
      id: row.participant_1.id,
      fullName: row.participant_1.full_name,
      phone: row.participant_1.phone,
      role: row.participant_1.role
    },
    participant2: {
      id: row.participant_2.id,
      fullName: row.participant_2.full_name,
      phone: row.participant_2.phone,
      role: row.participant_2.role
    },
    updatedAt: row.updated_at,
    createdAt: row.created_at
  }
}

export function mapMessageRow(row: {
  id: string
  conversation_id: string
  sender_user_id: string
  content: string
  created_at: Date
}) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    content: row.content,
    createdAt: row.created_at
  }
}

class ChatService {
  private async loadActivePeer(peerUserId: string) {
    const peer = await prisma.users.findUnique({
      where: { id: peerUserId },
      select: { id: true, status: true }
    })
    if (peer == null || peer.status !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.BAD_REQUEST,
        message: USER_MESSAGES.CHAT_PEER_INVALID
      })
    }
  }

  async createOrGetConversation({ userId, peerUserId }: { userId: string; peerUserId: string }) {
    await this.loadActivePeer(peerUserId)
    const [p1, p2] = sortParticipantIds(userId, peerUserId)

    const existing = await prisma.chat_conversations.findUnique({
      where: {
        participant_1_id_participant_2_id: {
          participant_1_id: p1,
          participant_2_id: p2
        }
      },
      include: conversationInclude
    })

    if (existing != null) {
      return { conversation: mapConversationRow(existing), created: false }
    }

    const row = await prisma.chat_conversations.create({
      data: {
        participant_1_id: p1,
        participant_2_id: p2
      },
      include: conversationInclude
    })

    return { conversation: mapConversationRow(row), created: true }
  }

  async listConversations(userId: string) {
    const rows = await prisma.chat_conversations.findMany({
      where: {
        OR: [{ participant_1_id: userId }, { participant_2_id: userId }]
      },
      orderBy: { updated_at: 'desc' },
      include: {
        ...conversationInclude,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: {
            content: true,
            created_at: true,
            sender_user_id: true
          }
        }
      }
    })

    const ids = rows.map((r) => r.id)
    const unreadMap = new Map<string, number>()
    if (ids.length > 0) {
      const counts = await prisma.$queryRaw<Array<{ conversation_id: string; cnt: bigint }>>`
        SELECT m.conversation_id, COUNT(*)::bigint AS cnt
        FROM chat_messages m
        LEFT JOIN chat_conversation_reads r
          ON r.conversation_id = m.conversation_id AND r.user_id = ${userId}::uuid
        WHERE m.conversation_id IN (${Prisma.join(ids)})
          AND m.sender_user_id <> ${userId}::uuid
          AND m.created_at > COALESCE(r.last_read_at, to_timestamp(0))
        GROUP BY m.conversation_id
      `
      for (const c of counts) {
        unreadMap.set(c.conversation_id, Number(c.cnt))
      }
    }

    return rows.map((row) => {
      const last = row.messages[0] ?? null
      const preview =
        last != null
          ? last.content.length > 80
            ? `${last.content.slice(0, 80)}…`
            : last.content
          : null
      return {
        ...mapConversationRow({
          id: row.id,
          participant_1_id: row.participant_1_id,
          participant_2_id: row.participant_2_id,
          updated_at: row.updated_at,
          created_at: row.created_at,
          participant_1: row.participant_1,
          participant_2: row.participant_2
        }),
        unreadCount: unreadMap.get(row.id) ?? 0,
        lastMessagePreview: preview,
        lastMessageAt: last != null ? last.created_at.toISOString() : null,
        lastMessageSenderUserId: last != null ? last.sender_user_id : null
      }
    })
  }

  async markConversationRead({ conversationId, userId }: { conversationId: string; userId: string }) {
    await this.assertParticipant(conversationId, userId)

    const latest = await prisma.chat_messages.findFirst({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true }
    })
    const at = latest?.created_at ?? new Date()

    await prisma.chat_conversation_reads.upsert({
      where: {
        conversation_id_user_id: {
          conversation_id: conversationId,
          user_id: userId
        }
      },
      create: {
        conversation_id: conversationId,
        user_id: userId,
        last_read_at: at
      },
      update: { last_read_at: at }
    })
  }

  async getConversationParticipantIds(conversationId: string): Promise<[string, string]> {
    const row = await prisma.chat_conversations.findUnique({
      where: { id: conversationId },
      select: { participant_1_id: true, participant_2_id: true }
    })
    if (row == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.CHAT_CONVERSATION_NOT_FOUND
      })
    }
    return [row.participant_1_id, row.participant_2_id]
  }

  async assertParticipant(conversationId: string, userId: string) {
    const conv = await prisma.chat_conversations.findFirst({
      where: {
        id: conversationId,
        OR: [{ participant_1_id: userId }, { participant_2_id: userId }]
      },
      select: { id: true }
    })
    if (conv == null) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USER_MESSAGES.CHAT_CONVERSATION_NOT_FOUND
      })
    }
  }

  async createMessage({
    conversationId,
    senderUserId,
    senderStatus,
    content
  }: {
    conversationId: string
    senderUserId: string
    senderStatus: account_status
    content: string
  }) {
    if (senderStatus !== 'active') {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: USER_MESSAGES.USER_NOT_FOUND
      })
    }

    await this.assertParticipant(conversationId, senderUserId)

    const trimmed = content.trim()
    const [msg] = await prisma.$transaction([
      prisma.chat_messages.create({
        data: {
          conversation_id: conversationId,
          sender_user_id: senderUserId,
          content: trimmed
        }
      }),
      prisma.chat_conversations.update({
        where: { id: conversationId },
        data: { updated_at: new Date() }
      })
    ])

    return mapMessageRow(msg)
  }

  async listMessages({
    conversationId,
    userId,
    page = 1,
    limit = 50
  }: {
    conversationId: string
    userId: string
    page?: number
    limit?: number
  }) {
    await this.assertParticipant(conversationId, userId)

    const safePage = Math.max(1, page)
    const safeLimit = Math.min(100, Math.max(1, limit))
    const skip = (safePage - 1) * safeLimit

    const where = { conversation_id: conversationId }

    const [items, total] = await Promise.all([
      prisma.chat_messages.findMany({
        where,
        orderBy: { created_at: 'asc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          conversation_id: true,
          sender_user_id: true,
          content: true,
          created_at: true
        }
      }),
      prisma.chat_messages.count({ where })
    ])

    return {
      items: items.map(mapMessageRow),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    }
  }
}

const chatService = new ChatService()
export default chatService
