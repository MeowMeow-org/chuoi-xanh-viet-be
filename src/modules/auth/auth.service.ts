import prisma from '~/lib/prisma'
import { LoginRequestBody } from './auth.request'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import { TokenType } from '~/constants/enums'
import { signToken } from '~/utils/jwt'
import { StringValue } from 'ms'

class AuthService {
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
    const { fullName, password } = payload
    const user = await prisma.users.findUnique({
      where: {
        full_name: fullName,
        password_hash: password //chua decode hash
      }
    })

    if (user == null) {
      throw new ErrorWithStatus({
        message: USER_MESSAGES.INCORRECT_FULLNAME_OR_PASSWORD,
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
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) //
      }
    })

    return {
      access_token,
      refresh_token
    }
  }
}

//dùng singleton pattern
const authService = new AuthService()
export default authService
