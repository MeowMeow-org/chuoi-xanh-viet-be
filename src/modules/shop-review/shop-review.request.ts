export type CreateShopReviewBody = {
  order_id: string
  product_id: string
  rating: number
  comment?: string | null
}

export type UpdateShopReviewBody = {
  rating?: number
  comment?: string | null
}

export type ListShopReviewsQuery = {
  page?: string
  limit?: string
}
