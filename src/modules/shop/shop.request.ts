export interface SuggestShopQuery {
  farm_id?: string
}

export interface SuggestProductQuery {
  sale_unit_id?: string
}

export interface CreateShopRequestBody {
  farm_id: string
  name: string
  description?: string
  avatar_url?: string | null
}

export interface UpdateShopRequestBody {
  name?: string
  description?: string
  avatar_url?: string | null
  status?: string
}

export interface AddProductRequestBody {
  /** Lô đã phân (QR); bắt buộc — mùa vụ & tồn kho lấy từ lô */
  sale_unit_id: string
  /** Tuỳ chọn; mặc định BE đặt tên theo mã lô */
  name?: string
  description?: string
  price: number
  /** Tuỳ chọn; mặc định theo đơn vị lô */
  unit?: string
  /** Tuỳ chọn; mặc định theo số lượng lô */
  stock_qty?: number
  /** URL ảnh (vd. từ POST /upload), tối đa 512 ký tự */
  image_url?: string | null
}

export interface GetPublicProductsQuery {
  page?: string
  limit?: string
  searchTerm?: string
  /** @deprecated dùng province_code để filter chính xác. Giữ để backward-compat. */
  province?: string
  district?: string
  ward?: string
  /** Code hành chính theo provinces.open-api.vn (số nguyên dương) */
  province_code?: string
  district_code?: string
  ward_code?: string
  shopId?: string
  /** newest | price_asc | price_desc */
  sort?: string
  minPrice?: string
  maxPrice?: string
}

export interface GetShopsQuery {
  page?: string
  limit?: string
  searchTerm?: string
  /** @deprecated dùng province_code để filter chính xác. */
  province?: string
  district?: string
  ward?: string
  province_code?: string
  district_code?: string
  ward_code?: string
}

/** GET /shop/farm-locations — lọc theo địa phương giống chợ */
export interface GetFarmMapPinsQuery {
  province?: string
  district?: string
  ward?: string
}
