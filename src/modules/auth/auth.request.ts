import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'

export interface TokenPayLoad extends JwtPayload {
  user_id: string
  token_type: TokenType
}

export interface LoginRequestBody {
  email: string
  password: string
}
