import { JwtPayload } from 'jsonwebtoken'
import type { account_status, user_role } from '@prisma/client'
import { TokenType } from '~/constants/enums'

export interface TokenPayLoad extends JwtPayload {
  user_id: string
  token_type: TokenType
  role?: user_role
  status?: account_status
}

export interface LoginRequestBody {
  email: string
  password: string
}

export interface RegisterRequestBody {
  email: string
  password: string
  confirm_password: string
  full_name: string
  phone: string
  /** Self-service sign-up: farmer (nông hộ) or consumer (người tiêu dùng) only */
  role: 'consumer' | 'farmer'
}

export interface LogoutRequestBody {
  refreshToken: string
}

export interface RefreshTokenRequestBody {
  refreshToken: string
}

export interface ForgotPasswordRequestBody {
  email: string
}

export interface PatchMeRequestBody {
  /** URL ảnh đại diện (thường từ POST /upload). Gửi null hoặc chuỗi rỗng để xóa. */
  avatarUrl?: string | null
  fullName?: string
  phone?: string
  /** Zalo user_id (OA) để nhận tin nhắn từ Official Account — lấy sau khi user quan tâm OA. Gửi null hoặc rỗng để bỏ liên kết. */
  zaloUserId?: string | null
  /** Địa chỉ trụ sở / liên hệ HTX (hiển thị cho nông dân khi HTX xét duyệt chứng chỉ). */
  contactAddress?: string | null
  /** Trụ sở HTX — tên + mã địa giới (chỉ HTX được ghi xuống DB). */
  province?: string | null
  district?: string | null
  ward?: string | null
  provinceCode?: number | null
  districtCode?: number | null
  wardCode?: number | null
  latitude?: number | null
  longitude?: number | null
}

export interface ChangePasswordRequestBody {
  currentPassword: string
  newPassword: string
  confirm_password: string
}

export interface VerifyForgotPasswordRequestBody {
  forgot_password_token: string
}

export interface ResetPasswordRequestBody {
  password: string
  forgot_password_token: string
  confirm_password: string
}
