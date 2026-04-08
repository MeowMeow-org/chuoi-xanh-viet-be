import jwt from 'jsonwebtoken'
import { TokenPayLoad } from '~/modules/auth/auth.request'

export const signToken = ({
  payload, //
  privateKey, //
  options = { algorithm: 'HS256' }
}: {
  payload: any
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, function (err, token) {
      if (err) throw reject(err)
      return resolve(token as string)
    })
  })
}

export const verifyToken = ({
  token, //
  privateKey //
}: {
  token: string
  privateKey: string
}) => {
  return new Promise<TokenPayLoad>((resolve, reject) => {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (error) throw reject(error)
      return resolve(decoded as TokenPayLoad)
    })
  })
}
