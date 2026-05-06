import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { computeOrderSettlementVnd, getPlatformCommissionRate } from '../src/utils/orderSettlement'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string })
const prisma = new PrismaClient({ adapter })

const BUYER_EMAIL = 'ducvvm4a@gmail.com'
const DEMO_NOTE_TAG = 'Seed demo CXV — ducvvm4a'

async function main() {
  const rate = getPlatformCommissionRate()
  console.log(`PLATFORM_COMMISSION_RATE (snapshot): ${rate}`)

  let buyer = await prisma.users.findFirst({ where: { email: BUYER_EMAIL } })
  if (!buyer) {
    buyer = await prisma.users.create({
      data: {
        email: BUYER_EMAIL,
        phone: '0908877665',
        full_name: 'Demo Đơn hàng (seed)',
        role: 'consumer',
        password_hash: '123456',
        status: 'active',
        is_onboarding: false
      }
    })
    console.log(`Created consumer: ${BUYER_EMAIL} (password 123456)`)
  } else {
    console.log(`Using existing user: ${BUYER_EMAIL} (${buyer.id})`)
  }

  const existingDemo = await prisma.orders.findMany({
    where: { buyer_user_id: buyer.id, note: { contains: DEMO_NOTE_TAG } },
    select: { id: true }
  })
  if (existingDemo.length > 0) {
    const ids = existingDemo.map((o) => o.id)
    await prisma.order_items.deleteMany({ where: { order_id: { in: ids } } })
    await prisma.orders.deleteMany({ where: { id: { in: ids } } })
    console.log(`Removed ${ids.length} previous demo order(s)`)
  }

  const shops = await prisma.shops.findMany({
    where: { status: 'open' },
    take: 5,
    select: { id: true, name: true },
    orderBy: { created_at: 'asc' }
  })
  if (shops.length === 0) throw new Error('No shops in DB — run prisma seed first')

  const productByShop = new Map<string, { id: string; price: Prisma.Decimal; shop_id: string }>()
  for (const s of shops) {
    const prod = await prisma.products.findFirst({
      where: { shop_id: s.id, is_active: true },
      select: { id: true, price: true, shop_id: true }
    })
    if (prod) productByShop.set(s.id, prod)
  }
  if (productByShop.size === 0) throw new Error('No active products — run prisma seed first')

  const shopList = shops.filter((s) => productByShop.has(s.id))
  const pickShop = (i: number) => shopList[i % shopList.length]

  const mkLine = (
    shopId: string,
    qty: number
  ) => {
    const prod = productByShop.get(shopId)!
    const unit = Number(prod.price)
    const line = Math.round(unit * qty)
    return {
      products: { connect: { id: prod.id } },
      qty: new Prisma.Decimal(qty),
      unit_price: new Prisma.Decimal(unit),
      line_total: new Prisma.Decimal(line)
    }
  }

  const shipping = (suffix: string) => ({
    shipping_name: buyer!.full_name ?? 'Khách hàng',
    shipping_phone: buyer!.phone ?? '0900000000',
    shipping_address: `123 Đường Seed ${suffix}, Quận 1, TP.HCM`,
    note: `${DEMO_NOTE_TAG} — ${suffix}`
  })

  type OrderSeed = {
    suffix: string
    status: 'pending' | 'confirmed' | 'shipping' | 'delivered'
    payment_method: 'cod' | 'payos'
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
    qty: number
    shopIndex: number
    /** Khi delivered: ghi chốt */
    finalize?: boolean
  }

  const plan: OrderSeed[] = [
    { suffix: '1 chờ xác nhận', status: 'pending', payment_method: 'cod', payment_status: 'pending', qty: 2, shopIndex: 0 },
    { suffix: '2 đã xác nhận (ước tính)', status: 'confirmed', payment_method: 'cod', payment_status: 'pending', qty: 1, shopIndex: 1 },
    { suffix: '3 đang giao (ước tính)', status: 'shipping', payment_method: 'cod', payment_status: 'pending', qty: 3, shopIndex: 2 },
    {
      suffix: '4 đã giao (đã chốt)',
      status: 'delivered',
      payment_method: 'cod',
      payment_status: 'paid',
      qty: 2,
      shopIndex: 0,
      finalize: true
    },
    {
      suffix: '5 đã giao PayOS (đã chốt)',
      status: 'delivered',
      payment_method: 'payos',
      payment_status: 'paid',
      qty: 1,
      shopIndex: 1,
      finalize: true
    }
  ]

  for (const row of plan) {
    const shop = pickShop(row.shopIndex)
    const lines = [mkLine(shop.id, row.qty)]
    const total = lines.reduce((s, l) => s + Number(l.line_total), 0)

    const est = computeOrderSettlementVnd(total, rate)
    const data: Prisma.ordersCreateInput = {
      users: { connect: { id: buyer!.id } },
      shops: { connect: { id: shop.id } },
      status: row.status,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      total_amount: new Prisma.Decimal(total),
      ...shipping(row.suffix),
      order_items: { create: lines }
    }

    if (row.status === 'confirmed' || row.status === 'shipping' || row.status === 'delivered') {
      data.commission_rate = new Prisma.Decimal(rate)
      data.estimated_commission_amount = est.commissionAmount
      data.estimated_seller_payout = est.sellerPayout
      data.estimated_at = new Date()
    }

    if (row.finalize) {
      data.commission_amount = est.commissionAmount
      data.seller_payout = est.sellerPayout
      data.settled_at = new Date()
    }

    await prisma.orders.create({ data })
    console.log(`  ✓ Order: ${row.suffix} — ${total.toLocaleString('vi-VN')}đ (${shop.name})`)
  }

  console.log('')
  console.log(`✅ Created ${plan.length} demo orders for ${BUYER_EMAIL}`)
  console.log('   Đăng nhập consumer → Đơn hàng của tôi; farmer shop → Lợi nhuận / Đơn.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
