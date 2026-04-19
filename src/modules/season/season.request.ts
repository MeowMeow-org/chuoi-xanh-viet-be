import type { season_status } from '@prisma/client'

export interface SeasonParams {
  season_id: string
}

export interface CreateSeasonRequestBody {
  farmId: string
  /** Tuỳ chọn; nếu bỏ trống server tự sinh mã (6 chữ A–Z + 6 số). */
  code?: string
  cropName: string
  startDate: string
  harvestStartDate?: string
  harvestEndDate?: string
  estimatedYield: number
  actualYield?: number
  yieldUnit?: string
}

export interface UpdateSeasonRequestBody {
  code?: string
  cropName?: string
  startDate?: string
  harvestStartDate?: string | null
  harvestEndDate?: string | null
  estimatedYield?: number | null
  actualYield?: number | null
  yieldUnit?: string | null
}

export interface ChangeSeasonStatusRequestBody {
  status: season_status
}

export interface GetSeasonsQuery {
  page?: string
  limit?: string
  searchTerm?: string
  status?: season_status
  farmId?: string
}
