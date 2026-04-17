/** Query for GET /cooperative/htx */
export interface GetHtxListQuery {
  page?: string
  limit?: string
  searchTerm?: string
}

/** Query for GET /cooperative/members (HTX scope) */
export interface GetMyMembershipsQuery {
  page?: string
  limit?: string
  status?: 'pending' | 'approved' | 'rejected' | 'removed'
}

/** Body for POST .../reject */
export interface RejectMembershipBody {
  note?: string
}

/** Body for POST /cooperative/join-request (logged-in farmer) */
export interface RequestJoinCooperativeBody {
  cooperative_user_id: string
  farm_id: string
}
