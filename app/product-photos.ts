// app/product-photos.ts
import type { Lot } from "./lots";

/**
 * ✅ 1 foto por producto (thumbnail).
 * Asegúrate que existan estos archivos:
 * - assets/products/cacao-1.jpg
 * - assets/products/coffee-1.jpg
 * - assets/products/mango-1.jpg
 * - assets/products/hibiscus-1.jpg
 */
const PRODUCT_PHOTOS: Record<string, any> = {
  cacao: require("../assets/products/cacao-1.jpg"),
  coffee: require("../assets/products/coffee-1.jpg"),
  mango: require("../assets/products/mango-1.jpg"),
  hibiscus: require("../assets/products/hibiscus-1.jpg"),
};

export function getLotThumbnail(lot: Lot): any | null {
  const key = `${lot.product_en} ${lot.product_es}`.toLowerCase().trim();

  if (key.includes("cacao")) return PRODUCT_PHOTOS.cacao;
  if (key.includes("coffee")) return PRODUCT_PHOTOS.coffee; // Coffee Beans
  if (key.includes("mango")) return PRODUCT_PHOTOS.mango;
  if (key.includes("hibiscus")) return PRODUCT_PHOTOS.hibiscus;

  return null;
}
