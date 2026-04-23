import { Router } from 'express'
import { accessTokenValidator, requireFarmer } from '../auth/auth.middleware'
import { wrapAsync } from '~/utils/handler'
import {
  suggestShopController,
  suggestProductController,
  createShopController,
  updateShopController,
  getShopByIdController,
  getMyShopController,
  getShopsController,
  getAvailableSeasonsController,
  getAvailableSaleUnitsController,
  addProductController,
  getProductsController,
  getPublicProductsController,
  getPublicProductByIdController
} from './shop.controller'
import {
  suggestShopQueryValidator,
  suggestProductQueryValidator,
  createShopBodyValidator,
  updateShopBodyValidator,
  shopIdParamValidator,
  getShopsQueryValidator,
  addProductBodyValidator,
  getPublicProductsQueryValidator,
  productIdParamValidator
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
 * @desc list active products across all shops (consumer marketplace)
 * @route GET /shop/products?page=&limit=&searchTerm=&province=&shopId=
 * @access public (guest vẫn xem được)
 */
shopRouter.get('/products', getPublicProductsQueryValidator, wrapAsync(getPublicProductsController))

/**
 * @desc public product detail with shop + farm origin + season
 * @route GET /shop/products/:product_id
 * @access public (guest vẫn xem được)
 */
shopRouter.get('/products/:product_id', productIdParamValidator, wrapAsync(getPublicProductByIdController))

/**
 * @desc get all shops (search + pagination)
 * @route GET /shop/
 * @access public (guest vẫn xem được)
 */
shopRouter.get('/', getShopsQueryValidator, wrapAsync(getShopsController))

/**
 * @desc sale units on shop's farm that can still be listed (active, not yet a product)
 * @route GET /shop/:shop_id/available-sale-units
 * @access private (farmer only)
 */
shopRouter.get(
  '/:shop_id/available-sale-units',
  accessTokenValidator,
  requireFarmer,
  shopIdParamValidator,
  wrapAsync(getAvailableSaleUnitsController)
)

/**
 * @desc AI-suggest product description & unit price for a sale unit
 * @route GET /shop/:shop_id/suggest-product?sale_unit_id=
 * @access private (farmer only)
 */
shopRouter.get(
  '/:shop_id/suggest-product',
  accessTokenValidator,
  requireFarmer,
  shopIdParamValidator,
  suggestProductQueryValidator,
  wrapAsync(suggestProductController)
)

/**
 * @desc get shop detail
 * @route GET /shop/:shop_id
 * @access public (guest vẫn xem được)
 */
shopRouter.get('/:shop_id', shopIdParamValidator, wrapAsync(getShopByIdController))

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
 * @access public (guest vẫn xem được)
 */
shopRouter.get(
  '/:shop_id/products',
  shopIdParamValidator,
  getShopsQueryValidator,
  wrapAsync(getProductsController)
)

export default shopRouter
