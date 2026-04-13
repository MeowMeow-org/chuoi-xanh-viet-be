import prisma from '~/lib/prisma'

class FarmService {
  getFarms = async () => {
    return prisma.farms.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        owner_user_id: true,
        name: true,
        area_ha: true,
        crop_main: true,
        province: true,
        district: true,
        ward: true,
        address: true,
        latitude: true,
        longitude: true,
        created_at: true,
        updated_at: true
      }
    })
  }
}

const farmService = new FarmService()
export default farmService
