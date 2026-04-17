export interface CreateSaleUnitRequestBody {
  seasonId: string
  quantity: number
  unit?: string
  shortCode?: string
}

export interface ListSaleUnitsQuery {
  seasonId?: string
}
