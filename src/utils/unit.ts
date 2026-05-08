import { Prisma } from '@prisma/client'

/**
 * Hệ số quy đổi đơn vị khối lượng về kg.
 * Chỉ hỗ trợ các đơn vị mass thông dụng ở VN. Unit khác (bó, trái, thùng…) không
 * quy đổi được → trả về null, buộc caller phải xử lý riêng (vd. từ chối đổi unit).
 */
const MASS_FACTOR_TO_KG: Record<string, string> = {
  mg: '0.000001',
  g: '0.001',
  gam: '0.001',
  hg: '0.1',
  lạng: '0.1',
  lang: '0.1',
  kg: '1',
  ky: '1',
  kí: '1',
  kilogram: '1',
  yến: '10',
  yen: '10',
  tạ: '100',
  ta: '100',
  tấn: '1000',
  tan: '1000',
  ton: '1000',
  tonne: '1000'
}

export const normalizeUnit = (unit: string | null | undefined): string => {
  return (unit ?? '').trim().toLowerCase()
}

/** true nếu đơn vị thuộc nhóm khối lượng (có thể quy đổi sang kg) */
export const isMassUnit = (unit: string | null | undefined): boolean => {
  return MASS_FACTOR_TO_KG[normalizeUnit(unit)] !== undefined
}

/**
 * Quy đổi 1 số lượng (qty, unit) về kg. Trả về null nếu unit không phải đơn vị khối lượng.
 */
export const toKg = (qty: Prisma.Decimal | number | string, unit: string | null | undefined): Prisma.Decimal | null => {
  const factorStr = MASS_FACTOR_TO_KG[normalizeUnit(unit)]
  if (!factorStr) return null
  const q = qty instanceof Prisma.Decimal ? qty : new Prisma.Decimal(qty)
  return q.mul(new Prisma.Decimal(factorStr))
}

/**
 * Kiểm tra 2 đơn vị có “match” cho mục đích bán lô hay không.
 * - Cùng nhóm mass → OK (BE tự quy đổi stock_qty).
 * - Khác nhóm (vd. lô theo kg, sản phẩm theo "bó") → chỉ OK nếu bằng nhau chính xác sau normalize.
 */
export const isUnitCompatible = (productUnit: string, saleUnitUnit: string): boolean => {
  if (normalizeUnit(productUnit) === normalizeUnit(saleUnitUnit)) return true
  return isMassUnit(productUnit) && isMassUnit(saleUnitUnit)
}
