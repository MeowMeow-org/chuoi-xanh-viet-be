/** Query for GET /cooperative/htx */
export interface GetHtxListQuery {
  page?: string
  limit?: string
  searchTerm?: string
  /** UUID một hợp tác xã */
  id?: string
  /** Lọc theo tỉnh của nông trại (id nông trại) — dùng cho màn hình farmer chọn HTX */
  farmId?: string
}

/** Query for GET /cooperative/members (HTX scope) */
export interface GetMyMembershipsQuery {
  page?: string
  limit?: string
  status?: 'pending' | 'approved' | 'rejected' | 'removed'
  /** Tìm theo tên nông trại, địa chỉ, tên chủ hộ, email */
  searchTerm?: string
}

/** Body for POST .../reject */
export interface RejectMembershipBody {
  note?: string
}

/** Body for POST .../approve */
export interface ApproveMembershipBody {
  /** Ghi chú gửi kèm thông báo cho nông hộ (tùy chọn) */
  note?: string
}

/** Body for POST /cooperative/join-request (logged-in farmer) */
export interface RequestJoinCooperativeBody {
  cooperative_user_id: string
  farm_id: string
}
