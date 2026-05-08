import { Prisma } from '@prisma/client'

const DEFAULT_PLATFORM_COMMISSION_RATE = 0.05

/** Tỷ lệ hoa hồng nền tảng (0–1). Env: PLATFORM_COMMISSION_RATE, ví dụ 0.05 = 5%. */
export function getPlatformCommissionRate(): number {
  const raw = process.env.PLATFORM_COMMISSION_RATE
  if (raw === undefined || raw === '') return DEFAULT_PLATFORM_COMMISSION_RATE
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) return DEFAULT_PLATFORM_COMMISSION_RATE
  return n
}

/**
 * MVP: commission trên tổng đơn (total_amount có thể gồm dòng ship PayOS).
 * Làm tròn VND giống chỗ xử lý PayOS trong order.service (Math.round).
 */
export function computeOrderSettlementVnd(
  totalAmount: Prisma.Decimal | number | string,
  rate: number
): { commissionAmount: Prisma.Decimal; sellerPayout: Prisma.Decimal } {
  const total = Math.round(Number(totalAmount))
  const commission = Math.round(total * rate)
  const seller = total - commission
  return {
    commissionAmount: new Prisma.Decimal(commission),
    sellerPayout: new Prisma.Decimal(seller)
  }
}
