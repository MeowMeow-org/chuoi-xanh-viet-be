/** Query string shape for GET /farm (before coercion in controller). */
export interface GetFarmsQuery {
  page?: string
  limit?: string
  searchTerm?: string
}

export interface CreateFarmRequestBody {
  name: string
  area_ha?: number
  crop_main?: string
  province?: string
  district?: string
  ward?: string
  /** Code hành chính theo provinces.open-api.vn */
  province_code?: number
  district_code?: number
  ward_code?: number
  address?: string
  latitude?: number
  longitude?: number
  in_cooperative?: boolean
}

export interface UpdateFarmRequestBody {
  name?: string
  area_ha?: number
  crop_main?: string
  province?: string
  district?: string
  ward?: string
  province_code?: number
  district_code?: number
  ward_code?: number
  address?: string
  latitude?: number
  longitude?: number
  in_cooperative?: boolean
}
