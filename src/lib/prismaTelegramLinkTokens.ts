import prisma from '~/lib/prisma'

/** Delegate bảng `telegram_link_tokens` (Prisma schema). Tooling đôi khi không refresh client — ép kiểu tường minh. Luôn chạy `npx prisma generate` sau khi pull. */
export type TelegramLinkTokensDelegate = {
  deleteMany(args: { where: { user_id: string } }): Promise<unknown>
  delete(args: { where: { token: string } }): Promise<unknown>
  findUnique(args: {
    where: { token: string }
    select: { user_id: true; expires_at: true }
  }): Promise<{ user_id: string; expires_at: Date } | null>
  create(args: {
    data: { token: string; user_id: string; expires_at: Date }
  }): Promise<unknown>
}

export function prismaTelegramLinkTokens(): TelegramLinkTokensDelegate {
  return (prisma as unknown as { telegram_link_tokens: TelegramLinkTokensDelegate })
    .telegram_link_tokens
}

/** Trong `prisma.$transaction(async tx => …)` — cùng delegate, cast từ `tx`. */
export function prismaTelegramLinkTokensFromTx(tx: object): TelegramLinkTokensDelegate {
  return (tx as unknown as { telegram_link_tokens: TelegramLinkTokensDelegate })
    .telegram_link_tokens
}
