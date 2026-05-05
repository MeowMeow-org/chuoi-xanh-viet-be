import crypto from 'crypto'
import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { prismaTelegramLinkTokens, prismaTelegramLinkTokensFromTx } from '~/lib/prismaTelegramLinkTokens'

const LINK_TTL_MS = 15 * 60 * 1000

export function normalizeTelegramBotUsername(raw: string | undefined): string {
  const t = raw?.trim() ?? ''
  return t.startsWith('@') ? t.slice(1) : t
}

export function isTelegramDeepLinkConfigured(): boolean {
  return Boolean(normalizeTelegramBotUsername(process.env.TELEGRAM_BOT_USERNAME))
}

/** Tạo link t.me/... ?start=<token>; token lưu DB, TTL 15 phút. */
export async function issueTelegramDeepLinkForUser(userId: string): Promise<{
  deepLink: string
  expiresInSeconds: number
}> {
  const botUser = normalizeTelegramBotUsername(process.env.TELEGRAM_BOT_USERNAME)
  if (!botUser) throw new Error('TELEGRAM_BOT_USERNAME is not set')

  await prismaTelegramLinkTokens().deleteMany({ where: { user_id: userId } })

  const token = crypto.randomBytes(18).toString('hex')
  const expires_at = new Date(Date.now() + LINK_TTL_MS)

  await prismaTelegramLinkTokens().create({
    data: { token, user_id: userId, expires_at }
  })

  return {
    deepLink: `https://t.me/${botUser}?start=${token}`,
    expiresInSeconds: Math.floor(LINK_TTL_MS / 1000)
  }
}

export async function redeemTelegramStartPayload(
  startPayload: string,
  telegramChatId: string
): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const payload = startPayload.trim()
  if (!payload || payload.length > 64) return { ok: false, reason: 'invalid_payload' }

  const chat = telegramChatId.trim()
  if (!chat || !/^-?\d+$/.test(chat)) return { ok: false, reason: 'invalid_chat_id' }

  const row = await prismaTelegramLinkTokens().findUnique({
    where: { token: payload },
    select: { user_id: true, expires_at: true }
  })

  if (row == null) return { ok: false, reason: 'unknown_token' }
  if (row.expires_at.getTime() < Date.now()) {
    await prismaTelegramLinkTokens().delete({ where: { token: payload } }).catch(() => {})
    return { ok: false, reason: 'expired' }
  }

  const user = await prisma.users.findUnique({
    where: { id: row.user_id },
    select: { id: true, role: true }
  })
  if (user == null || user.role !== 'farmer') {
    await prismaTelegramLinkTokens().delete({ where: { token: payload } }).catch(() => {})
    return { ok: false, reason: 'not_farmer' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.users.update({
      where: { id: user.id },
      data: { telegram_chat_id: chat } as unknown as Prisma.usersUpdateInput
    })
    await prismaTelegramLinkTokensFromTx(tx).deleteMany({ where: { user_id: user.id } })
  })

  return { ok: true, userId: user.id }
}
