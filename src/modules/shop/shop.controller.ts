import { Request, Response, NextFunction } from 'express'
import type { ParamsDictionary } from 'express-serve-static-core'
import shopService from './shop.service'
import HTTP_STATUS from '~/constants/httpStatus'
import USER_MESSAGES from '~/constants/messages'
import type {
  SuggestShopQuery,
  SuggestProductQuery,
  CreateShopRequestBody,
  UpdateShopRequestBody,
  GetShopsQuery,
  GetFarmMapPinsQuery,
  AddProductRequestBody,
  GetPublicProductsQuery
} from './shop.request'
import type { TokenPayLoad } from '../auth/auth.request'

export const suggestShopController = async (
  req: Request<ParamsDictionary, unknown, unknown, SuggestShopQuery>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await shopService.suggestShop({ farmId: req.query.farm_id as string, userId: user_id })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.SHOP_SUGGEST_SUCCESS,
    data
  })
}

export const suggestProductController = async (
  req: Request<{ shop_id: string }, unknown, unknown, SuggestProductQuery>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const data = await shopService.suggestProductListing({
    shopId: req.params.shop_id,
    saleUnitId: req.query.sale_unit_id as string,
    userId: user_id
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.PRODUCT_LISTING_SUGGEST_SUCCESS,
    data
  })
}

export const createShopController = async (
  req: Request<ParamsDictionary, unknown, CreateShopRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const shop = await shopService.createShop({ userId: user_id, payload: req.body })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.CREATE_SHOP_SUCCESS,
    data: shop
  })
}

export const updateShopController = async (
  req: Request<{ shop_id: string }, unknown, UpdateShopRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const shop = await shopService.updateShop({
    shopId: req.params.shop_id,
    userId: user_id,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.UPDATE_SHOP_SUCCESS,
    data: shop
  })
}

export const getShopByIdController = async (
  req: Request<{ shop_id: string }>,
  res: Response,
  _next: NextFunction
) => {
  const shop = await shopService.getShopById(req.params.shop_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SHOP_SUCCESS,
    data: shop
  })
}

export const getMyShopController = async (req: Request, res: Response, _next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const shops = await shopService.getMyShop(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_MY_SHOP_SUCCESS,
    data: shops
  })
}

export const getShopsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetShopsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const searchTerm = typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined
  const province = typeof req.query.province === 'string' ? req.query.province : undefined
  const district = typeof req.query.district === 'string' ? req.query.district : undefined
  const ward = typeof req.query.ward === 'string' ? req.query.ward : undefined

  const result = await shopService.getShops({ page, limit, searchTerm, province, district, ward })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_SHOPS_SUCCESS,
    data: result
  })
}

export const getFarmMapPinsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetFarmMapPinsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const province = typeof req.query.province === 'string' ? req.query.province : undefined
  const district = typeof req.query.district === 'string' ? req.query.district : undefined
  const ward = typeof req.query.ward === 'string' ? req.query.ward : undefined

  const data = await shopService.getFarmMapPins({ province, district, ward })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_FARM_MAP_PINS_SUCCESS,
    data
  })
}

// ─── Products ────────────────────────────────────────────

export const getAvailableSeasonsController = async (req: Request, res: Response, _next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const seasons = await shopService.getAvailableSeasons(user_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_AVAILABLE_SEASONS_SUCCESS,
    data: seasons
  })
}

export const getAvailableSaleUnitsController = async (
  req: Request<{ shop_id: string }>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const rows = await shopService.getAvailableSaleUnitsForShop({
    shopId: req.params.shop_id,
    userId: user_id
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_AVAILABLE_SALE_UNITS_SUCCESS,
    data: rows
  })
}

export const addProductController = async (
  req: Request<{ shop_id: string }, unknown, AddProductRequestBody>,
  res: Response,
  _next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const product = await shopService.addProduct({
    shopId: req.params.shop_id,
    userId: user_id,
    payload: req.body
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.CREATED,
    message: USER_MESSAGES.ADD_PRODUCT_SUCCESS,
    data: product
  })
}

export const getProductsController = async (
  req: Request<{ shop_id: string }, unknown, unknown, GetShopsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined

  const result = await shopService.getProducts({ shopId: req.params.shop_id, page, limit })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_PRODUCTS_SUCCESS,
    data: result
  })
}

export const getPublicProductsController = async (
  req: Request<ParamsDictionary, unknown, unknown, GetPublicProductsQuery>,
  res: Response,
  _next: NextFunction
) => {
  const page = req.query.page !== undefined ? Number(req.query.page) : undefined
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined
  const searchTerm = typeof req.query.searchTerm === 'string' ? req.query.searchTerm : undefined
  const province = typeof req.query.province === 'string' ? req.query.province : undefined
  const district = typeof req.query.district === 'string' ? req.query.district : undefined
  const ward = typeof req.query.ward === 'string' ? req.query.ward : undefined
  const shopId = typeof req.query.shopId === 'string' ? req.query.shopId : undefined
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined
  const minPrice = req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined
  const maxPrice = req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined

  const result = await shopService.getPublicProducts({
    page,
    limit,
    searchTerm,
    province,
    district,
    ward,
    shopId,
    sort,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined
  })

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_PRODUCTS_SUCCESS,
    data: result
  })
}

export const getPublicProductByIdController = async (
  req: Request<{ product_id: string }>,
  res: Response,
  _next: NextFunction
) => {
  const product = await shopService.getPublicProductById(req.params.product_id)

  return res.sendResponse({
    statusCode: HTTP_STATUS.OK,
    message: USER_MESSAGES.GET_PRODUCT_DETAIL_SUCCESS,
    data: product
  })
}
