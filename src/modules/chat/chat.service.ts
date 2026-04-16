import type { account_status } from '@prisma/client'
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
      include: conversationInclude
    })

    return rows.map(mapConversationRow)
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
