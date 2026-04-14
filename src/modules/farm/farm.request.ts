/** Query string shape for GET /farm (before coercion in controller). */
export interface GetFarmsQuery {
  page?: string
  limit?: string
  searchTerm?: string
}
