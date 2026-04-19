export interface SuggestShopQuery {
  farm_id?: string
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

export interface GetShopsQuery {
  page?: string
  limit?: string
  searchTerm?: string
  /** Lọc theo tỉnh/thành (farm), giống danh sách sản phẩm công khai */
  province?: string
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
  province?: string
  shopId?: string
}
