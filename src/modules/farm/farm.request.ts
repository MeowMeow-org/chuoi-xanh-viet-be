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
  address?: string
  latitude?: number
  longitude?: number
  in_cooperative?: boolean
}
