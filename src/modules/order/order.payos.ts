import { PayOS } from '@payos/node'

let payosClient: PayOS | null = null

function getPayOS(): PayOS {
  if (!payosClient) {
    payosClient = new PayOS()
  }
  return payosClient
}

/** Kiểu khớp CreatePaymentLinkRequest của SDK (tránh import subpath). */
export type PayosCreateLinkInput = {
  orderCode: number
  amount: number
  description: string
  cancelUrl: string
  returnUrl: string
  signature?: string
  items?: Array<{ name: string; quantity: number; price: number }>
  /** Unix timestamp (giây), Int32 theo API PayOS */
  expiredAt?: number
}

export type PayosWebhookBody = {
  code: string
  desc: string
  success: boolean
  data: {
    orderCode: number
    amount: number
    description: string
    accountNumber: string
    reference: string
    transactionDateTime: string
    currency: string
    paymentLinkId: string
    code: string
    desc: string
  }
  signature: string
}

/**
 * Mã đơn PayOS (number). Phải nằm trong Number.MAX_SAFE_INTEGER:
 * `base * 10_000` với base = time % 1e12 có thể ~1e16 → làm tròn JSON, PayOS từ chối / sai chữ ký.
 */
export function generatePayosOrderCode(): number {
  const millis = Date.now() % 1_000_000_000
  const rand = Math.floor(Math.random() * 1_000_000)
  return millis * 1_000_000 + rand
}

export async function createPayosPaymentLink(payload: PayosCreateLinkInput) {
  const payos = getPayOS()
  return payos.paymentRequests.create(payload)
}

/** Domain hosted checkout (khớp response create link PayOS). */
const PAYOS_CHECKOUT_WEB_BASE = 'https://pay.payos.vn/web'

/** Dữ liệu GET /v2/payment-requests/:id — thường KHÔNG có checkoutUrl/qrCode; có `id` = payment link id. */
export type PayosPaymentRequestSnapshot = {
  id?: string
  paymentLinkId?: string
  checkoutUrl?: string
  qrCode?: string
  status?: string
  amount?: number
  accountNumber?: string
  accountName?: string
  bin?: string
  description?: string
  orderCode?: number
  currency?: string
}

/** Lấy URL mở cổng PayOS: ưu tiên checkoutUrl từ API, không có thì dựng từ id link. */
export function resolvePayosHostedCheckoutUrl(pr: PayosPaymentRequestSnapshot): string | undefined {
  const direct = pr.checkoutUrl?.trim()
  if (direct) return direct
  const linkId = pr.paymentLinkId?.trim() || pr.id?.trim()
  if (linkId) return `${PAYOS_CHECKOUT_WEB_BASE}/${linkId}`
  return undefined
}

export async function getPayosPaymentRequestByOrderCode(orderCode: number): Promise<PayosPaymentRequestSnapshot> {
  const payos = getPayOS()
  const data = await payos.paymentRequests.get(orderCode)
  return data as PayosPaymentRequestSnapshot
}

export async function verifyPayosWebhook(webhook: PayosWebhookBody) {
  const payos = getPayOS()
  return payos.webhooks.verify(webhook as Parameters<PayOS['webhooks']['verify']>[0])
}

export async function cancelPayosPaymentByOrderCode(orderCode: string, reason = 'Hủy đơn') {
  const code = Number(orderCode)
  if (!Number.isFinite(code)) return
  const payos = getPayOS()
  await payos.paymentRequests.cancel(code, reason)
}