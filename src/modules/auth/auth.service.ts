import prisma from '~/lib/prisma'
import { LoginRequestBody, RegisterRequestBody } from './auth.request'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { TokenType } from '~/constants/enums'
import { signToken } from '~/utils/jwt'
import { sendResetPasswordEmail } from '~/utils/email'
import ms, { StringValue } from 'ms'

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

  private signAccessToken(user_id: string) {
    return signToken({
      privateKey: process.env.JWT_ACCESS_TOKEN_SECRET as string,
      payload: {
        user_id,
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

    const user_id = user.id.toString()

    //sign token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])

    await prisma.refresh_tokens.create({
      data: {
        user_id,
        token_hash: refresh_token, //
        device_id: '',
        expires_at: this.getRefreshTokenExpiresAt()
      }
    })

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    }
  }

  register = async (payload: RegisterRequestBody) => {
    const { email, password, full_name, phone } = payload

    const [existingEmail, existingPhone] = await Promise.all([
      prisma.users.findFirst({ where: { email } }),
      prisma.users.findFirst({ where: { phone } })
    ])

    if (existingEmail != null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.EMAIL_ALREADY_EXISTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    if (existingPhone != null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.PHONE_ALREADY_EXISTS,
        status: HTTP_STATUS.CONFLICT
      })
    }

    const user = await prisma.users.create({
      data: {
        email,
        password_hash: password, // keeping same strategy as current login
        full_name,
        phone
      }
    })

    const user_id = user.id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
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

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
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

    const [access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
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
