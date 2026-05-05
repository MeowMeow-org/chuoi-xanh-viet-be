import { Prisma, type account_status, type user_role } from '@prisma/client'
import prisma from '~/lib/prisma'
import { LoginRequestBody, RegisterRequestBody } from './auth.request'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { TokenType } from '~/constants/enums'
import { signToken } from '~/utils/jwt'
import { sendResetPasswordEmail } from '~/utils/email'
import ms, { StringValue } from 'ms'

export type AuthPublicUser = {
  id: string
  fullName: string
  email: string | null
  phone: string
  role: user_role
  status: account_status
  onBoarding: boolean
  avatarUrl: string | null
  zaloUserId: string | null
  contactAddress: string | null
  province: string | null
  district: string | null
  ward: string | null
  provinceCode: number | null
  districtCode: number | null
  wardCode: number | null
  latitude: number | null
  longitude: number | null
}

class AuthService {
  private getRefreshTokenExpiresAt() {
    const refreshTokenExpiresIn = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN as StringValue
    const ttl = ms(refreshTokenExpiresIn)

    if (typeof ttl !== 'number') {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.REFRESH_TOKEN_IS_INVALID,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR
      })
    }

    return new Date(Date.now() + ttl)
  }

  private signAccessToken({ user_id, role, status }: { user_id: string; role: user_role; status: account_status }) {
    return signToken({
      privateKey: process.env.JWT_ACCESS_TOKEN_SECRET as string,
      payload: {
        user_id,
        role,
        status,
        token_type: TokenType.AccessToken
      },
      options: { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN as StringValue }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_REFRESH_TOKEN_SECRET as string,
      payload: {
        user_id,
        token_type: TokenType.RefreshToken
      },
      options: { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN as StringValue }
    })
  }

  private signResetPasswordToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_RESET_PASSWORD_TOKEN_SECRET as string,
      payload: {
        user_id,
        token_type: TokenType.ResetPasswordToken
      },
      options: { expiresIn: process.env.JWT_RESET_PASSWORD_TOKEN_EXPIRES_IN as StringValue }
    })
  }

  createAuthSessionForUser = async ({
    user_id,
    role,
    status
  }: {
    user_id: string
    role: user_role
    status: account_status
  }) => {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, role, status }),
      this.signRefreshToken(user_id)
    ])

    await prisma.refresh_tokens.create({
      data: {
        user_id,
        token_hash: refresh_token,
        device_id: '',
        expires_at: this.getRefreshTokenExpiresAt()
      }
    })

    return { access_token, refresh_token }
  }

  private toAuthUser(u: {
    id: string
    full_name: string
    email: string | null
    phone: string
    role: user_role
    status: account_status
    is_onboarding: boolean
    avatar_url: string | null
    zalo_user_id: string | null
    contact_address: string | null
    province: string | null
    district: string | null
    ward: string | null
    province_code: number | null
    district_code: number | null
    ward_code: number | null
    latitude: Prisma.Decimal | null
    longitude: Prisma.Decimal | null
  }): AuthPublicUser {
    return {
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      onBoarding: u.is_onboarding,
      avatarUrl: u.avatar_url ?? null,
      zaloUserId: u.zalo_user_id ?? null,
      contactAddress: u.contact_address ?? null,
      province: u.province ?? null,
      district: u.district ?? null,
      ward: u.ward ?? null,
      provinceCode: u.province_code ?? null,
      districtCode: u.district_code ?? null,
      wardCode: u.ward_code ?? null,
      latitude: u.latitude != null ? Number(u.latitude) : null,
      longitude: u.longitude != null ? Number(u.longitude) : null
    }
  }

  login = async (payload: LoginRequestBody) => {
    const { email, password } = payload
    const user = await prisma.users.findFirst({
      where: {
        email,
        password_hash: password //chua decode hash
      }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.INCORRECT_EMAIL_OR_PASSWORD,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    if (user.status === 'suspended') {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.ACCOUNT_SUSPENDED,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const user_id = user.id.toString()
    const { access_token, refresh_token } = await this.createAuthSessionForUser({
      user_id,
      role: user.role,
      status: user.status
    })

    return {
      access_token,
      refresh_token,
      user: this.toAuthUser(user)
    }
  }

  register = async (payload: RegisterRequestBody) => {
    const { email, password, full_name, phone, role } = payload

    const [existingEmail, existingPhone] = await Promise.all([
      prisma.users.findFirst({ where: { email } }),
      prisma.users.findFirst({ where: { phone } })
    ])

    if (existingEmail != null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.EMAIL_ALREADY_EXISTS,
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY
      })
    }

    if (existingPhone != null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.PHONE_ALREADY_EXISTS,
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY
      })
    }

    const user = await prisma.users.create({
      data: {
        email,
        password_hash: password, // keeping same strategy as current login
        full_name,
        phone,
        role
      }
    })

    const user_id = user.id.toString()
    const { access_token, refresh_token } = await this.createAuthSessionForUser({
      user_id,
      role: user.role,
      status: user.status
    })

    return {
      access_token,
      refresh_token,
      user: this.toAuthUser(user)
    }
  }

  logout = async ({ user_id, refresh_token }: { user_id: string; refresh_token: string }) => {
    const row = await prisma.refresh_tokens.findFirst({
      where: {
        user_id,
        token_hash: refresh_token
      }
    })

    if (row == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.REFRESH_TOKEN_NOT_FOUND,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    if (row.revoked_at == null) {
      await prisma.refresh_tokens.update({
        where: { id: row.id },
        data: { revoked_at: new Date() }
      })
    }
  }

  refreshToken = async ({ user_id, refresh_token }: { user_id: string; refresh_token: string }) => {
    const tokenRow = await prisma.refresh_tokens.findFirst({
      where: {
        user_id,
        token_hash: refresh_token
      }
    })

    if (tokenRow == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.REFRESH_TOKEN_NOT_FOUND,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    if (tokenRow.revoked_at != null || tokenRow.expires_at.getTime() <= Date.now()) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.REFRESH_TOKEN_IS_INVALID,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: {
        role: true,
        status: true
      }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    if (user.status === 'suspended') {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.ACCOUNT_SUSPENDED,
        status: HTTP_STATUS.FORBIDDEN
      })
    }

    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken({ user_id, role: user.role, status: user.status }),
      this.signRefreshToken(user_id)
    ])

    await prisma.$transaction([
      prisma.refresh_tokens.update({
        where: { id: tokenRow.id },
        data: { revoked_at: new Date() }
      }),
      prisma.refresh_tokens.create({
        data: {
          user_id,
          token_hash: new_refresh_token,
          device_id: tokenRow.device_id || '',
          expires_at: this.getRefreshTokenExpiresAt()
        }
      })
    ])

    return {
      access_token,
      refresh_token: new_refresh_token
    }
  }

  getMe = async (user_id: string): Promise<AuthPublicUser> => {
    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        is_onboarding: true,
        avatar_url: true,
        zalo_user_id: true,
        contact_address: true,
        province: true,
        district: true,
        ward: true,
        province_code: true,
        district_code: true,
        ward_code: true,
        latitude: true,
        longitude: true
      }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    return this.toAuthUser({
      ...user,
      avatar_url: user.avatar_url ?? null,
      zalo_user_id: user.zalo_user_id ?? null,
      contact_address: user.contact_address ?? null,
      province: user.province ?? null,
      district: user.district ?? null,
      ward: user.ward ?? null,
      province_code: user.province_code ?? null,
      district_code: user.district_code ?? null,
      ward_code: user.ward_code ?? null,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null
    })
  }

  updateMe = async (
    user_id: string,
    payload: {
      avatar_url?: string | null
      full_name?: string
      phone?: string
      zalo_user_id?: string | null
      contact_address?: string | null
      province?: string | null
      district?: string | null
      ward?: string | null
      province_code?: number | null
      district_code?: number | null
      ward_code?: number | null
      latitude?: number | null
      longitude?: number | null
    }
  ): Promise<AuthPublicUser> => {
    const actor = await prisma.users.findUnique({
      where: { id: user_id },
      select: { role: true }
    })
    if (actor == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }
    const isCoop = actor.role === 'cooperative'

    const data: Prisma.usersUpdateInput = {}

    if (payload.avatar_url !== undefined) {
      const raw = payload.avatar_url
      if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        data.avatar_url = null
      } else if (typeof raw === 'string') {
        const v = raw.trim()
        if (v.length > 2048) {
          throw new ErrorWithStatus({
            status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
            message: USER_MESSAGES.AVATAR_URL_INVALID
          })
        }
        data.avatar_url = v
      } else {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.AVATAR_URL_INVALID
        })
      }
    }

    if (payload.full_name !== undefined) {
      const v = payload.full_name.trim()
      if (v.length === 0) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.FULL_NAME_IS_REQUIRED
        })
      }
      data.full_name = v
    }

    if (payload.phone !== undefined) {
      const v = payload.phone.trim()
      if (v.length === 0) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.PHONE_IS_REQUIRED
        })
      }
      const taken = await prisma.users.findFirst({
        where: { phone: v, NOT: { id: user_id } }
      })
      if (taken != null) {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USER_MESSAGES.PHONE_ALREADY_EXISTS
        })
      }
      data.phone = v
    }

    if (payload.zalo_user_id !== undefined) {
      const raw = payload.zalo_user_id
      if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        data.zalo_user_id = null
      } else if (typeof raw === 'string') {
        const v = raw.trim()
        if (!/^\d{1,50}$/.test(v)) {
          throw new ErrorWithStatus({
            status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
            message: USER_MESSAGES.ZALO_USER_ID_INVALID
          })
        }
        data.zalo_user_id = v
      } else {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.ZALO_USER_ID_INVALID
        })
      }
    }

    if (payload.contact_address !== undefined) {
      const raw = payload.contact_address
      if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        data.contact_address = null
      } else if (typeof raw === 'string') {
        const v = raw.trim()
        if (v.length > 500) {
          throw new ErrorWithStatus({
            status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
            message: USER_MESSAGES.CONTACT_ADDRESS_INVALID
          })
        }
        data.contact_address = v
      } else {
        throw new ErrorWithStatus({
          status: HTTP_STATUS.BAD_REQUEST,
          message: USER_MESSAGES.CONTACT_ADDRESS_INVALID
        })
      }
    }

    if (isCoop) {
      const assignName = (
        value: string | null | undefined,
        setter: (v: string | null) => void
      ) => {
        if (value === undefined) return
        if (value === null) {
          setter(null)
          return
        }
        if (typeof value !== 'string') return
        const t = value.trim()
        setter(t === '' ? null : t.length > 100 ? t.slice(0, 100) : t)
      }

      assignName(payload.province, (v) => {
        data.province = v
      })
      assignName(payload.district, (v) => {
        data.district = v
      })
      assignName(payload.ward, (v) => {
        data.ward = v
      })

      if (payload.province_code !== undefined) {
        data.province_code = payload.province_code
      }
      if (payload.district_code !== undefined) {
        data.district_code = payload.district_code
      }
      if (payload.ward_code !== undefined) {
        data.ward_code = payload.ward_code
      }

      if (payload.latitude !== undefined || payload.longitude !== undefined) {
        const la = payload.latitude
        const lo = payload.longitude
        if (la === null || lo === null) {
          data.latitude = null
          data.longitude = null
        } else if (
          typeof la === 'number' &&
          Number.isFinite(la) &&
          typeof lo === 'number' &&
          Number.isFinite(lo)
        ) {
          if (la < -90 || la > 90 || lo < -180 || lo > 180) {
            throw new ErrorWithStatus({
              status: HTTP_STATUS.BAD_REQUEST,
              message: USER_MESSAGES.COOP_HQ_COORDINATES_INVALID
            })
          }
          data.latitude = new Prisma.Decimal(la)
          data.longitude = new Prisma.Decimal(lo)
        } else {
          throw new ErrorWithStatus({
            status: HTTP_STATUS.BAD_REQUEST,
            message: USER_MESSAGES.COOP_HQ_COORDINATES_INVALID
          })
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return this.getMe(user_id)
    }

    await prisma.users.update({
      where: { id: user_id },
      data
    })
    return this.getMe(user_id)
  }

  changePassword = async ({
    user_id,
    currentPassword,
    newPassword
  }: {
    user_id: string
    currentPassword: string
    newPassword: string
  }) => {
    const user = await prisma.users.findUnique({
      where: { id: user_id },
      select: { password_hash: true }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    if (user.password_hash == null || user.password_hash !== currentPassword) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.CURRENT_PASSWORD_INCORRECT,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }

    await prisma.users.update({
      where: { id: user_id },
      data: { password_hash: newPassword }
    })
  }

  findUserByEmail = async (email: string) => {
    return await prisma.users.findUnique({
      where: { email }
    })
  }

  forgotPassword = async (email: string) => {
    const user = await this.findUserByEmail(email)

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.EMAIL_IS_NOT_EXISTED,
        status: HTTP_STATUS.NOT_FOUND
      })
    }

    const user_id = user.id.toString()
    const reset_password_token = await this.signResetPasswordToken(user_id)

    await prisma.users.update({
      where: { id: user_id },
      data: { reset_password_token }
    })

    await sendResetPasswordEmail({ to: email, resetToken: reset_password_token })
  }

  verifyForgotPassword = async ({
    user_id,
    forgot_password_token
  }: {
    user_id: string
    forgot_password_token: string
  }) => {
    const user = await prisma.users.findUnique({
      where: { id: user_id, reset_password_token: forgot_password_token }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.VERIFY_FORGOT_PASSWORD_IS_INVALID,
        status: HTTP_STATUS.UNAUTHORIZED
      })
    }
  }

  resetPassword = async ({ user_id, password }: { user_id: string; password: string }) => {
    await prisma.users.update({
      where: { id: user_id },
      data: { password_hash: password, reset_password_token: null } //chưa hash password
    })
  }
}

//dùng singleton pattern
const authService = new AuthService()
export default authService
