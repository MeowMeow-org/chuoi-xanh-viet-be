export interface SuggestShopQuery {
  farm_id?: string
}

export interface CreateShopRequestBody {
  farm_id: string
  name: string
  description?: string
}

export interface UpdateShopRequestBody {
  name?: string
  description?: string
  status?: string
}

export interface GetShopsQuery {
  page?: string
  limit?: string
  searchTerm?: string
}

export interface AddProductRequestBody {
  season_id: string
  name: string
  description?: string
  price: number
  unit?: string
  stock_qty?: number
}
