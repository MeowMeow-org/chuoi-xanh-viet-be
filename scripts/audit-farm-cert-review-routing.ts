import prisma from '~/lib/prisma'

type Coord = { lat: number; lng: number }

function toNumber(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function hasCodes(row: {
  province_code: number | null
  district_code: number | null
  ward_code: number | null
}) {
  return (
    row.province_code != null || row.district_code != null || row.ward_code != null
  )
}

function centroid(points: Coord[]): Coord | null {
  if (points.length === 0) return null
  return {
    lat: points.reduce((acc, p) => acc + p.lat, 0) / points.length,
    lng: points.reduce((acc, p) => acc + p.lng, 0) / points.length
  }
}

async function run() {
  const [farms, coops] = await Promise.all([
    prisma.farms.findMany({
      select: {
        id: true,
        name: true,
        province_code: true,
        district_code: true,
        ward_code: true,
        latitude: true,
        longitude: true
      }
    }),
    prisma.users.findMany({
      where: { role: 'cooperative', status: 'active' },
      select: {
        id: true,
        full_name: true,
        cooperative_members_as_cooperative: {
          where: { status: 'approved' },
          select: {
            farms: {
              select: {
                latitude: true,
                longitude: true,
                province_code: true,
                district_code: true,
                ward_code: true
              }
            }
          }
        }
      }
    })
  ])

  const coopRepresentations = coops.map((c) => {
    const memberFarms = c.cooperative_members_as_cooperative.map((m) => m.farms)
    const coords = memberFarms
      .map((f) => {
        const lat = toNumber(f.latitude)
        const lng = toNumber(f.longitude)
        return lat != null && lng != null ? { lat, lng } : null
      })
      .filter((p): p is Coord => p != null)
    return {
      id: c.id,
      name: c.full_name,
      hasAnyCodes: memberFarms.some((f) => hasCodes(f)),
      centroid: centroid(coords)
    }
  })

  const farmsMissingCoords = farms.filter(
    (f) => toNumber(f.latitude) == null || toNumber(f.longitude) == null
  )
  const farmsMissingCodes = farms.filter((f) => !hasCodes(f))

  const coopsMissingCentroid = coopRepresentations.filter((c) => c.centroid == null)
  const coopsMissingCodes = coopRepresentations.filter((c) => !c.hasAnyCodes)

  console.log('=== Farm cert routing audit ===')
  console.log(`Total farms: ${farms.length}`)
  console.log(`Farms missing coordinates: ${farmsMissingCoords.length}`)
  console.log(`Farms missing all admin codes: ${farmsMissingCodes.length}`)
  console.log(`Active cooperatives: ${coops.length}`)
  console.log(`Coops missing centroid: ${coopsMissingCentroid.length}`)
  console.log(`Coops missing all admin codes: ${coopsMissingCodes.length}`)

  if (farmsMissingCoords.length > 0) {
    console.log('\nTop farms missing coordinates:')
    farmsMissingCoords.slice(0, 20).forEach((f) => {
      console.log(`- ${f.id} | ${f.name ?? 'N/A'}`)
    })
  }

  if (coopsMissingCentroid.length > 0) {
    console.log('\nTop cooperatives missing centroid:')
    coopsMissingCentroid.slice(0, 20).forEach((c) => {
      console.log(`- ${c.id} | ${c.name ?? 'N/A'}`)
    })
  }
}

run()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
