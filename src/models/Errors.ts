import HTTP_STATUS from '~/constants/httpStatus'

type ErrorType = Record<string, { msg: string; [key: string]: any }>

export class ErrorWithStatus {
  status: number
  message: string

  constructor({ status, message }: { status: number; message: string }) {
    //truyền chung nên bỏ vào object
    this.status = status
    this.message = message
  }
}

export class EntityError extends ErrorWithStatus {
  errors: ErrorType
  constructor({ errors, message = 'Validation Error' }: { errors: ErrorType; message?: string }) {
    super({ message, status: HTTP_STATUS.UNPROCESSABLE_ENTITY })
    this.errors = errors
  }
}
