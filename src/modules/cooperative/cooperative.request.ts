/** Body for POST /cooperative/register-farmer-applicant */
export interface RegisterFarmerApplicantBody {
  email: string
  password: string
  confirm_password: string
  full_name: string
  phone: string
  cooperative_user_id: string
  farm_name: string
}

/** Query for GET /cooperative/htx */
export interface GetHtxListQuery {
  page?: string
  limit?: string
  searchTerm?: string
}

/** Body for POST .../reject */
export interface RejectMembershipBody {
  note?: string
}
