import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string })
const prisma = new PrismaClient({ adapter })

// ─── Helpers ────────────────────────────────────────────────

/**
 * We keep the same convention as auth.service: password_hash stores the raw
 * password. Do NOT use this in production.
 */
const DEFAULT_PASSWORD = '123456'

type SeedUser = {
  email: string
  phone: string
  full_name: string
  role: 'consumer' | 'farmer' | 'cooperative'
}

type SeedFarm = {
  owner_email: string
  name: string
  area_ha: number
  crop_main: string
  province: string
  district: string
  ward: string
  address: string
  latitude: number
  longitude: number
}

type SeedShop = {
  farm_name: string
  name: string
  description: string
  certifications: string[]
  is_verified: boolean
}

type SeedSeason = {
  farm_name: string
  code: string
  crop_name: string
  start_date: string
  harvest_start_date: string
  harvest_end_date: string
  estimated_yield: number
  actual_yield: number
}

type SeedProduct = {
  shop_name: string
  season_code: string
  name: string
  description: string
  price: number
  unit: string
  stock_qty: number
}

// ─── Data ───────────────────────────────────────────────────

const consumers: SeedUser[] = [
  {
    email: 'mai@consumer.vn',
    phone: '0912345678',
    full_name: 'Trần Thị Mai',
    role: 'consumer'
  },
  {
    email: 'nam@consumer.vn',
    phone: '0912345679',
    full_name: 'Lê Hoàng Nam',
    role: 'consumer'
  }
]

/** Tài khoản HTX đăng nhập (role cooperative). Mật khẩu: 123456 — cùng convention seed hiện tại. */
const cooperatives: SeedUser[] = [
  {
    email: 'lienhe@htx-rauxanh-laichau.vn',
    phone: '0902000001',
    full_name: 'Hợp tác xã Rau an toàn Lai Châu',
    role: 'cooperative'
  },
  {
    email: 'vanphong@htx-nongsan-dienbien.vn',
    phone: '0902000002',
    full_name: 'Hợp tác xã Nông sản sạch Điện Biên',
    role: 'cooperative'
  },
  {
    email: 'tonghop@htx-chuoi-lamdong.vn',
    phone: '0902000003',
    full_name: 'Hợp tác xã Chuối hữu cơ Lâm Đồng',
    role: 'cooperative'
  },
  {
    email: 'kinhdoanh@htx-raucu-tiengiang.vn',
    phone: '0902000004',
    full_name: 'Hợp tác xã Rau củ quả Tiền Giang',
    role: 'cooperative'
  },
  {
    email: 'hotro@htx-thuysan-caomau.vn',
    phone: '0902000005',
    full_name: 'Hợp tác xã Thủy sản bền vững Cà Mau',
    role: 'cooperative'
  }
]

const farmers: SeedUser[] = [
  {
    email: 'minh@farmer.vn',
    phone: '0901000001',
    full_name: 'Nguyễn Văn Minh',
    role: 'farmer'
  },
  {
    email: 'tai@farmer.vn',
    phone: '0901000002',
    full_name: 'Lê Văn Tài',
    role: 'farmer'
  },
  {
    email: 'huong@farmer.vn',
    phone: '0901000003',
    full_name: 'Phạm Thị Hương',
    role: 'farmer'
  }
]

const farms: SeedFarm[] = [
  {
    owner_email: 'minh@farmer.vn',
    name: 'Trang trại Rau sạch Long Hòa',
    area_ha: 2.5,
    crop_main: 'Rau ăn lá',
    province: 'TP. Hồ Chí Minh',
    district: 'Cần Giờ',
    ward: 'Long Hòa',
    address: 'Ấp Long Thạnh, xã Long Hòa',
    latitude: 10.412,
    longitude: 106.878
  },
  {
    owner_email: 'tai@farmer.vn',
    name: 'Nông trại Phú An',
    area_ha: 1.8,
    crop_main: 'Rau gia vị',
    province: 'TP. Hồ Chí Minh',
    district: 'Củ Chi',
    ward: 'Phú An',
    address: 'Ấp 4, xã Phú An',
    latitude: 11.014,
    longitude: 106.512
  },
  {
    owner_email: 'huong@farmer.vn',
    name: 'HTX Rau quả Bình Chánh',
    area_ha: 5.0,
    crop_main: 'Rau ăn quả',
    province: 'TP. Hồ Chí Minh',
    district: 'Bình Chánh',
    ward: 'Tân Quý Tây',
    address: 'Ấp 2, xã Tân Quý Tây',
    latitude: 10.678,
    longitude: 106.573
  }
]

const seasons: SeedSeason[] = [
  {
    farm_name: 'Trang trại Rau sạch Long Hòa',
    code: 'LH-2026-01',
    crop_name: 'Rau muống hữu cơ',
    start_date: '2026-01-15',
    harvest_start_date: '2026-03-01',
    harvest_end_date: '2026-05-30',
    estimated_yield: 1800,
    actual_yield: 1750
  },
  {
    farm_name: 'Nông trại Phú An',
    code: 'PA-2026-01',
    crop_name: 'Rau gia vị tổng hợp',
    start_date: '2026-01-20',
    harvest_start_date: '2026-03-05',
    harvest_end_date: '2026-05-20',
    estimated_yield: 900,
    actual_yield: 880
  },
  {
    farm_name: 'HTX Rau quả Bình Chánh',
    code: 'BC-2026-01',
    crop_name: 'Dưa leo - Cà chua - Bí đao',
    start_date: '2026-02-01',
    harvest_start_date: '2026-03-20',
    harvest_end_date: '2026-06-15',
    estimated_yield: 4500,
    actual_yield: 4300
  }
]

const shops: SeedShop[] = [
  {
    farm_name: 'Trang trại Rau sạch Long Hòa',
    name: 'Gian hàng Rau sạch Long Hòa',
    description:
      'Chuyên rau ăn lá trồng theo VietGAP, không thuốc hóa học. Thu hoạch mỗi sáng, giao hàng nhanh TP.HCM.',
    certifications: ['VietGAP', 'Hữu cơ'],
    is_verified: true
  },
  {
    farm_name: 'Nông trại Phú An',
    name: 'Nông trại Phú An Củ Chi',
    description:
      'Rau gia vị và rau ăn lá gia đình 3 đời, trồng theo hướng hữu cơ. Giao sáng sớm cho bếp và nhà hàng.',
    certifications: ['VietGAP'],
    is_verified: true
  },
  {
    farm_name: 'HTX Rau quả Bình Chánh',
    name: 'HTX Rau quả Bình Chánh',
    description:
      'Hợp tác xã quy mô 5ha, cung cấp dưa leo, cà chua, bí đao cho siêu thị và bếp ăn. Đạt GlobalGAP.',
    certifications: ['VietGAP', 'GlobalGAP'],
    is_verified: true
  }
]

const products: SeedProduct[] = [
  // Shop 1 — Long Hòa
  {
    shop_name: 'Gian hàng Rau sạch Long Hòa',
    season_code: 'LH-2026-01',
    name: 'Rau muống hữu cơ',
    description:
      'Rau muống trồng theo VietGAP, không dùng thuốc trừ sâu hóa học. Thu hoạch mỗi sáng, tươi ngon.',
    price: 25000,
    unit: 'bó',
    stock_qty: 150
  },
  {
    shop_name: 'Gian hàng Rau sạch Long Hòa',
    season_code: 'LH-2026-01',
    name: 'Cải ngọt Long Hòa',
    description: 'Cải ngọt lá xanh giòn, vị ngọt thanh, không thuốc BVTV tồn dư.',
    price: 22000,
    unit: 'bó',
    stock_qty: 120
  },
  {
    shop_name: 'Gian hàng Rau sạch Long Hòa',
    season_code: 'LH-2026-01',
    name: 'Mồng tơi tươi',
    description: 'Mồng tơi trồng tự nhiên, lá dày, nấu canh ngon ngọt.',
    price: 18000,
    unit: 'bó',
    stock_qty: 100
  },
  {
    shop_name: 'Gian hàng Rau sạch Long Hòa',
    season_code: 'LH-2026-01',
    name: 'Rau dền đỏ',
    description: 'Rau dền đỏ hữu cơ, giàu sắt, màu sắc tự nhiên không phẩm màu.',
    price: 20000,
    unit: 'bó',
    stock_qty: 80
  },
  {
    shop_name: 'Gian hàng Rau sạch Long Hòa',
    season_code: 'LH-2026-01',
    name: 'Xà lách xoong',
    description: 'Xà lách xoong giòn ngọt, thích hợp ăn sống và làm salad.',
    price: 28000,
    unit: 'bó',
    stock_qty: 60
  },
  {
    shop_name: 'Gian hàng Rau sạch Long Hòa',
    season_code: 'LH-2026-01',
    name: 'Rau cải bó xôi',
    description: 'Bó xôi (spinach) VietGAP, giàu sắt, lá xanh mướt.',
    price: 35000,
    unit: 'bó',
    stock_qty: 50
  },

  // Shop 2 — Phú An
  {
    shop_name: 'Nông trại Phú An Củ Chi',
    season_code: 'PA-2026-01',
    name: 'Húng quế tươi',
    description: 'Húng quế trồng tự nhiên, thơm nồng. Dùng nấu phở, ăn kèm bún.',
    price: 10000,
    unit: 'bó',
    stock_qty: 200
  },
  {
    shop_name: 'Nông trại Phú An Củ Chi',
    season_code: 'PA-2026-01',
    name: 'Ngò gai',
    description: 'Ngò gai (mùi tàu) gia vị không thể thiếu của canh chua, phở.',
    price: 8000,
    unit: 'bó',
    stock_qty: 180
  },
  {
    shop_name: 'Nông trại Phú An Củ Chi',
    season_code: 'PA-2026-01',
    name: 'Hành lá',
    description: 'Hành lá tươi xanh, thu hoạch sáng, dùng cho mọi món ăn.',
    price: 12000,
    unit: 'bó',
    stock_qty: 160
  },
  {
    shop_name: 'Nông trại Phú An Củ Chi',
    season_code: 'PA-2026-01',
    name: 'Tía tô tím',
    description: 'Tía tô lá tím đậm, thơm đặc trưng, ăn kèm bún đậu, bún ốc.',
    price: 12000,
    unit: 'bó',
    stock_qty: 120
  },
  {
    shop_name: 'Nông trại Phú An Củ Chi',
    season_code: 'PA-2026-01',
    name: 'Xà lách lô lô xanh',
    description: 'Xà lách lô lô xanh giòn ngọt, không thuốc trừ sâu. Lý tưởng cho salad và cuốn.',
    price: 20000,
    unit: 'bó',
    stock_qty: 80
  },
  {
    shop_name: 'Nông trại Phú An Củ Chi',
    season_code: 'PA-2026-01',
    name: 'Bạc hà',
    description: 'Lá bạc hà tươi thơm, pha trà, trang trí món ăn và nước uống.',
    price: 15000,
    unit: 'bó',
    stock_qty: 70
  },

  // Shop 3 — Bình Chánh
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Dưa leo baby',
    description:
      'Dưa leo baby giòn ngọt, kích thước nhỏ gọn, ăn sống hoặc làm salad. Đạt GlobalGAP.',
    price: 30000,
    unit: 'kg',
    stock_qty: 100
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Cà chua Savior F1',
    description: 'Cà chua Savior F1 quả đều, đỏ tươi, vị ngọt thanh. Chuẩn VietGAP.',
    price: 35000,
    unit: 'kg',
    stock_qty: 120
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Bí đao xanh',
    description: 'Bí đao xanh tươi ngon, trồng theo hướng hữu cơ. Thích hợp nấu canh, xào.',
    price: 18000,
    unit: 'kg',
    stock_qty: 90
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Bí ngòi',
    description: 'Bí ngòi (zucchini) trồng GlobalGAP, dùng xào tỏi hoặc nướng.',
    price: 32000,
    unit: 'kg',
    stock_qty: 60
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Khổ qua (mướp đắng)',
    description: 'Khổ qua trái đều, đắng dịu, nấu canh hoặc nhồi thịt.',
    price: 25000,
    unit: 'kg',
    stock_qty: 70
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Cà tím dài',
    description: 'Cà tím dài trồng theo tiêu chuẩn VietGAP, vỏ tím bóng, ruột ít hạt.',
    price: 22000,
    unit: 'kg',
    stock_qty: 80
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Đậu bắp xanh',
    description: 'Đậu bắp non giòn ngọt, không xơ, luộc chấm hoặc xào tỏi.',
    price: 28000,
    unit: 'kg',
    stock_qty: 55
  },
  {
    shop_name: 'HTX Rau quả Bình Chánh',
    season_code: 'BC-2026-01',
    name: 'Ớt chuông đỏ',
    description: 'Ớt chuông đỏ giòn ngọt, giàu vitamin C. Dùng xào, nướng, salad.',
    price: 55000,
    unit: 'kg',
    stock_qty: 40
  }
]

// ─── Image pool (random assign khi seed product) ────────────

const PRODUCT_IMAGE_POOL = [
  'http://159.223.66.161:3070/uploads/2026/04/17/2d2ab109-7b0e-413d-bd45-bd6e7df0c264.jpg',
  'http://159.223.66.161:3070/uploads/2026/04/17/ec2d47d4-6436-455e-a581-c9643520ef9b.jpg',
  'http://159.223.66.161:3070/uploads/2026/04/17/65137abe-c175-4abe-a1ab-cc7bd0cda4f9.jpg',
  'http://159.223.66.161:3070/uploads/2026/04/17/23eb16f1-08ad-405c-a7a7-adae618a8528.jpg'
]

function pickRandomImage(seed: string) {
  // Dùng hash đơn giản theo tên product để mỗi product có image ổn định giữa các lần seed.
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return PRODUCT_IMAGE_POOL[hash % PRODUCT_IMAGE_POOL.length]
}

// ─── Main ───────────────────────────────────────────────────

async function upsertUser(u: SeedUser) {
  // Tìm user đã tồn tại theo email hoặc phone (email/phone đều unique trong DB).
  const existing = await prisma.users.findFirst({
    where: { OR: [{ email: u.email }, { phone: u.phone }] },
    select: { id: true, email: true, phone: true }
  })

  const base = {
    email: u.email,
    phone: u.phone,
    full_name: u.full_name,
    role: u.role,
    password_hash: DEFAULT_PASSWORD,
    status: 'active' as const
  }

  if (existing) {
    return prisma.users.update({ where: { id: existing.id }, data: base })
  }
  return prisma.users.create({ data: base })
}

async function main() {
  console.log('🌱  Seeding database...')

  // Users
  for (const u of consumers) await upsertUser(u)
  for (const u of cooperatives) await upsertUser(u)
  for (const u of farmers) await upsertUser(u)
  const allUsers = await prisma.users.findMany({ select: { id: true, email: true } })
  const userIdByEmail = new Map(allUsers.map((u) => [u.email ?? '', u.id]))
  console.log(`  ✓ Users: ${allUsers.length}`)

  // Farms: upsert theo (owner_user_id, name)
  for (const f of farms) {
    const ownerId = userIdByEmail.get(f.owner_email)
    if (!ownerId) continue

    const existing = await prisma.farms.findFirst({
      where: { owner_user_id: ownerId, name: f.name },
      select: { id: true }
    })
    const data = {
      owner_user_id: ownerId,
      name: f.name,
      area_ha: new Prisma.Decimal(f.area_ha),
      crop_main: f.crop_main,
      province: f.province,
      district: f.district,
      ward: f.ward,
      address: f.address,
      latitude: new Prisma.Decimal(f.latitude),
      longitude: new Prisma.Decimal(f.longitude),
      in_cooperative: false
    }

    if (existing) {
      await prisma.farms.update({ where: { id: existing.id }, data })
    } else {
      await prisma.farms.create({ data })
    }
  }
  const allFarms = await prisma.farms.findMany({ select: { id: true, name: true, owner_user_id: true } })
  const farmIdByName = new Map(allFarms.map((f) => [f.name, f.id]))
  console.log(`  ✓ Farms: ${allFarms.length}`)

  // Seasons: unique by code
  for (const s of seasons) {
    const farmId = farmIdByName.get(s.farm_name)
    if (!farmId) continue
    const farm = allFarms.find((f) => f.id === farmId)
    if (!farm) continue

    await prisma.seasons.upsert({
      where: { code: s.code },
      update: {
        farm_id: farmId,
        crop_name: s.crop_name,
        start_date: new Date(s.start_date),
        harvest_start_date: new Date(s.harvest_start_date),
        harvest_end_date: new Date(s.harvest_end_date),
        estimated_yield: new Prisma.Decimal(s.estimated_yield),
        actual_yield: new Prisma.Decimal(s.actual_yield),
        yield_unit: 'kg',
        status: 'anchored',
        sealed_at: new Date(),
        created_by: farm.owner_user_id
      },
      create: {
        farm_id: farmId,
        code: s.code,
        crop_name: s.crop_name,
        start_date: new Date(s.start_date),
        harvest_start_date: new Date(s.harvest_start_date),
        harvest_end_date: new Date(s.harvest_end_date),
        estimated_yield: new Prisma.Decimal(s.estimated_yield),
        actual_yield: new Prisma.Decimal(s.actual_yield),
        yield_unit: 'kg',
        status: 'anchored',
        sealed_at: new Date(),
        created_by: farm.owner_user_id
      }
    })
  }
  const allSeasons = await prisma.seasons.findMany({ select: { id: true, code: true } })
  const seasonIdByCode = new Map(allSeasons.map((s) => [s.code, s.id]))
  console.log(`  ✓ Seasons: ${allSeasons.length}`)

  // Shops: unique farm_id
  for (const sh of shops) {
    const farmId = farmIdByName.get(sh.farm_name)
    if (!farmId) continue

    await prisma.shops.upsert({
      where: { farm_id: farmId },
      update: {
        name: sh.name,
        description: sh.description,
        status: 'open',
        is_verified: sh.is_verified,
        certifications: sh.certifications as unknown as Prisma.InputJsonValue
      },
      create: {
        farm_id: farmId,
        name: sh.name,
        description: sh.description,
        status: 'open',
        is_verified: sh.is_verified,
        certifications: sh.certifications as unknown as Prisma.InputJsonValue
      }
    })
  }
  const allShops = await prisma.shops.findMany({ select: { id: true, name: true } })
  const shopIdByName = new Map(allShops.map((s) => [s.name, s.id]))
  console.log(`  ✓ Shops: ${allShops.length}`)

  // Products: upsert by (shop_id, name)
  for (const p of products) {
    const shopId = shopIdByName.get(p.shop_name)
    const seasonId = seasonIdByCode.get(p.season_code)
    if (!shopId || !seasonId) continue

    const existing = await prisma.products.findFirst({
      where: { shop_id: shopId, name: p.name },
      select: { id: true }
    })

    // Field chung cho cả create và update (không gồm FK scalar vì Prisma 7 không cho set FK trực tiếp khi update).
    const commonData = {
      name: p.name,
      description: p.description,
      price: new Prisma.Decimal(p.price),
      unit: p.unit,
      stock_qty: new Prisma.Decimal(p.stock_qty),
      image_url: pickRandomImage(p.name),
      is_active: true
    }

    if (existing) {
      await prisma.products.update({
        where: { id: existing.id },
        data: {
          ...commonData,
          seasons: { connect: { id: seasonId } }
        }
      })
    } else {
      await prisma.products.create({
        data: {
          ...commonData,
          shops: { connect: { id: shopId } },
          seasons: { connect: { id: seasonId } }
        }
      })
    }
  }
  const productCount = await prisma.products.count()
  console.log(`  ✓ Products: ${productCount}`)

  console.log('')
  console.log('✅  Seed complete.')
  console.log('')
  console.log('Demo accounts (password: 123456):')
  console.log('  Consumer   : mai@consumer.vn / nam@consumer.vn')
  console.log('  Cooperative (5 HTX):')
  for (const c of cooperatives) {
    console.log(`    • ${c.email}  |  ${c.phone}  |  ${c.full_name}`)
  }
  console.log('  Farmer     : minh@farmer.vn / tai@farmer.vn / huong@farmer.vn')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
