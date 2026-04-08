//một hàm nhận vào checkSchema
//chạy checkSchema để trả về middleware
//tự khui lỗi
//tự response lỗi lun

import { NextFunction, Request, Response } from 'express'
import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import HTTP_STATUS from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/Errors'

//giúp giảm tải công việc ở controller
//hàm nhận vào validation(kq của checkSchema) sau đó trả ra middleware
//middleware: check validation, khui lỗi, response lỗi(nếu có)
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    //check lỗi bằng validation (kết quả của checkSchema)
    await validation.run(req)
    //khui lỗi
    const error = validationResult(req) //lấy lỗi từ req ra
    //if else
    if (error.isEmpty()) {
      return next()
    }

    const errorObject = error.mapped()
    const entityError = new EntityError({ errors: {} })
    //errorObject xử lý riêng

    for (const key in errorObject) {
      const { msg } = errorObject[key]
      if (msg instanceof ErrorWithStatus && msg.status !== HTTP_STATUS.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      //những lỗi ko đặc biệt thì gom vào xong mới next
      entityError.errors[key] = msg
    }

    return next(entityError)
  }
}
