/**
 * Backfill `province_code/district_code/ward_code` cho `farms` từ tên (text) hiện có.
 * Chạy 1 lần sau khi migrate `20260505140000_address_codes`.
 *
 *   npx ts-node scripts/backfill-address-codes.ts
 *
 * - Nguồn danh mục: https://provinces.open-api.vn (cùng nguồn FE).
 * - Match dùng so sánh không dấu, bỏ prefix "Tỉnh/Thành phố/Quận/Huyện/Phường/Xã" hai bên.
 * - Hàng nào không match thì giữ nguyên `*_code = NULL` và in cảnh báo để admin fix tay.
 */

import prisma from '../src/lib/prisma'

type Province = { code: number; name: string; districts: District[] }
type District = { code: number; name: string; wards: Ward[] }
type Ward = { code: number; name: string }

const VN_API_BASE = 'https://provinces.open-api.vn/api'

function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

const PREFIXES = [
  'thanh pho',
  'tinh',
  'quan',
  'huyen',
  'thi xa',
  'thi tran',
  'phuong',
  'xa'
]

function normalizeName(raw: string | null | undefined): string {
  if (!raw) return ''
  let s = stripDiacritics(raw).toLowerCase().trim()
  for (const p of PREFIXES) {
    if (s.startsWith(p + ' ')) {
      s = s.slice(p.length + 1).trim()
      break
    }
  }
  return s.replace(/\s+/g, ' ')
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return (await res.json()) as T
}

async function loadCatalog(): Promise<Province[]> {
  const data = await fetchJson<Province[]>(`${VN_API_BASE}/?depth=3`)
  return data
}

async function main() {
  console.log('[backfill-address] tải danh mục địa giới VN…')
  const provinces = await loadCatalog()
  console.log(`[backfill-address] đã tải ${provinces.length} tỉnh/thành.`)

  const provinceByName = new Map<string, Province>()
  for (const p of provinces) provinceByName.set(normalizeName(p.name), p)

  const farms = await prisma.farms.findMany({
    where: { OR: [{ province_code: null }, { district_code: null }, { ward_code: null }] },
    select: {
      id: true,
      province: true,
      district: true,
      ward: true,
      province_code: true,
      district_code: true,
      ward_code: true
    }
  })
  console.log(`[backfill-address] xét ${farms.length} farm có code thiếu.`)

  let updated = 0
  let provinceMissed = 0
  let districtMissed = 0
  let wardMissed = 0

  for (const farm of farms) {
    const provNorm = normalizeName(farm.province)
    const distNorm = normalizeName(farm.district)
    const wardNorm = normalizeName(farm.ward)

    let provinceCode = farm.province_code
    let districtCode = farm.district_code
    let wardCode = farm.ward_code

    let province: Province | undefined
    if (provNorm) {
      province = provinceByName.get(provNorm)
      if (!province) {
        provinceMissed += 1
        console.warn(`  [warn] farm=${farm.id} không match tỉnh "${farm.province}"`)
      } else if (!provinceCode) {
        provinceCode = province.code
      }
    }

    let district: District | undefined
    if (province && distNorm) {
      district = province.districts.find((d) => normalizeName(d.name) === distNorm)
      if (!district) {
        districtMissed += 1
        console.warn(
          `  [warn] farm=${farm.id} không match huyện "${farm.district}" trong tỉnh "${province.name}"`
        )
      } else if (!districtCode) {
        districtCode = district.code
      }
    }

    if (district && wardNorm) {
      const ward = district.wards.find((w) => normalizeName(w.name) === wardNorm)
      if (!ward) {
        wardMissed += 1
        console.warn(
          `  [warn] farm=${farm.id} không match xã "${farm.ward}" trong huyện "${district.name}"`
        )
      } else if (!wardCode) {
        wardCode = ward.code
      }
    }

    const willUpdate =
      provinceCode !== farm.province_code ||
      districtCode !== farm.district_code ||
      wardCode !== farm.ward_code

    if (willUpdate) {
      await prisma.farms.update({
        where: { id: farm.id },
        data: {
          province_code: provinceCode ?? null,
          district_code: districtCode ?? null,
          ward_code: wardCode ?? null
        }
      })
      updated += 1
    }
  }

  console.log('[backfill-address] xong:')
  console.log(`  - cập nhật: ${updated} farm`)
  console.log(`  - miss tỉnh: ${provinceMissed}, miss huyện: ${districtMissed}, miss xã: ${wardMissed}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
