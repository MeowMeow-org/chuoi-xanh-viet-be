import type { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'
import type { TokenPayLoad } from '../auth/auth.request'
import { ErrorWithStatus } from '~/models/Errors'
import chatService from './chat.service'
import { notificationDispatch } from '~/modules/notification/notification.dispatch'

let ioRef: Server | null = null

function roomName(conversationId: string) {
  return `chat:${conversationId}`
}

export function broadcastChatMessage(conversationId: string, payload: Record<string, unknown>) {
  ioRef?.to(roomName(conversationId)).emit('chat:message', payload)
}

export function registerChatSocket(io: Server) {
  ioRef = io

  io.use((socket, next) => {
    try {
      const raw =
        (socket.handshake.auth?.token as string | undefined) ??
        (typeof socket.handshake.query.token === 'string' ? socket.handshake.query.token : undefined)
      if (!raw) {
        return next(new Error('Unauthorized'))
      }
      const decoded = jwt.verify(raw, process.env.JWT_ACCESS_TOKEN_SECRET as string) as TokenPayLoad
      if (decoded.token_type !== TokenType.AccessToken) {
        return next(new Error('Unauthorized'))
      }
      if (!decoded.user_id || !decoded.status) {
        return next(new Error('Unauthorized'))
      }
      socket.data.userId = decoded.user_id
      socket.data.role = decoded.role ?? 'consumer'
      socket.data.status = decoded.status
      return next()
    } catch {
      return next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('chat:join', async (payload: { conversationId: string }, cb?: (err?: Error) => void) => {
      try {
        const conversationId = payload?.conversationId
        if (!conversationId || typeof conversationId !== 'string') {
          throw new Error('Invalid payload')
        }
        await chatService.assertParticipant(conversationId, socket.data.userId)
        await socket.join(roomName(conversationId))
        cb?.()
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Join failed')
        cb?.(err)
      }
    })

    socket.on('chat:leave', async (payload: { conversationId: string }) => {
      const id = payload?.conversationId
      if (typeof id === 'string') {
        await socket.leave(roomName(id))
      }
    })

    socket.on(
      'chat:send',
      async (payload: { conversationId: string; content: string }, cb?: (err?: Error, data?: unknown) => void) => {
        try {
          const { conversationId, content } = payload ?? {}
          if (!conversationId || typeof content !== 'string') {
            throw new Error('Invalid payload')
          }
          const msg = await chatService.createMessage({
            conversationId,
            senderUserId: socket.data.userId,
            senderStatus: socket.data.status,
            content
          })
          io.to(roomName(conversationId)).emit('chat:message', msg)
          notificationDispatch.chatMessageForPeer({
            conversationId,
            senderUserId: socket.data.userId
          })
          cb?.(undefined, msg)
        } catch (e) {
          if (e instanceof ErrorWithStatus) {
            cb?.(new Error(e.message))
          } else {
            cb?.(e instanceof Error ? e : new Error('Send failed'))
          }
        }
      }
    )
  })
}
