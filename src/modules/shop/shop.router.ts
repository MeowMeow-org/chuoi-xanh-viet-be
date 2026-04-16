import { Router } from 'express'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  suggestShopController,
  createShopController,
  updateShopController,
  getShopByIdController,
  getMyShopController,
  getShopsController,
  getAvailableSeasonsController,
  addProductController,
  getProductsController
} from './shop.controller'
import {
  suggestShopQueryValidator,
  createShopBodyValidator,
  updateShopBodyValidator,
  shopIdParamValidator,
  getShopsQueryValidator,
  addProductBodyValidator
} from './shop.middleware'

const shopRouter = Router()

/**
 * @desc AI-suggest shop name & description based on farm
 * @route GET /shop/suggest?farm_id=
 * @access private (farmer only)
 */
shopRouter.get(
  '/suggest',
  accessTokenValidator,
  requireFarmer,
  suggestShopQueryValidator,
  wrapAsync(suggestShopController)
)

/**
 * @desc get shops owned by the authenticated farmer
 * @route GET /shop/mine
 * @access private (farmer only)
 */
shopRouter.get('/mine', accessTokenValidator, requireFarmer, wrapAsync(getMyShopController))

/**
 * @desc list farmer's seasons available for product creation
 * @route GET /shop/available-seasons
 * @access private (farmer only)
 */
shopRouter.get('/available-seasons', accessTokenValidator, requireFarmer, wrapAsync(getAvailableSeasonsController))

/**
 * @desc get all shops (search + pagination)
 * @route GET /shop/
 * @access private
 */
shopRouter.get('/', accessTokenValidator, getShopsQueryValidator, wrapAsync(getShopsController))

/**
 * @desc get shop detail
 * @route GET /shop/:shop_id
 * @access private
 */
shopRouter.get('/:shop_id', accessTokenValidator, shopIdParamValidator, wrapAsync(getShopByIdController))

/**
 * @desc create shop for a farm
 * @route POST /shop/
 * @access private (farmer only)
 */
shopRouter.post(
  '/',
  accessTokenValidator,
  requireFarmer,
  createShopBodyValidator,
  wrapAsync(createShopController)
)

/**
 * @desc update shop
 * @route PATCH /shop/:shop_id
 * @access private (farmer only)
 */
shopRouter.patch(
  '/:shop_id',
  accessTokenValidator,
  requireFarmer,
  shopIdParamValidator,
  updateShopBodyValidator,
  wrapAsync(updateShopController)
)

/**
 * @desc add product to shop (must be from farmer's own season)
 * @route POST /shop/:shop_id/products
 * @access private (farmer only)
 */
shopRouter.post(
  '/:shop_id/products',
  accessTokenValidator,
  requireFarmer,
  shopIdParamValidator,
  addProductBodyValidator,
  wrapAsync(addProductController)
)

/**
 * @desc list products in a shop
 * @route GET /shop/:shop_id/products
 * @access private
 */
shopRouter.get(
  '/:shop_id/products',
  accessTokenValidator,
  shopIdParamValidator,
  getShopsQueryValidator,
  wrapAsync(getProductsController)
)

export default shopRouter
