// app/lots.ts
import type { Lang } from "./i18n";

export type Lot = {
  id: string;
  product_en: string;
  product_es: string;
  origin: string;
  harvestDate: string;
  batch: string;
  notes?: string;

  // ⭐ optional
  rating?: number; // 1..5
};

export const initialLots: Lot[] = [
  {
    id: "LOT-0001",
    product_en: "Coffee Beans",
    product_es: "Granos de café",
    origin: "Santa Ana, El Salvador",
    harvestDate: "2026-01-02",
    batch: "BATCH-A1",
    notes: "Demo lot for web/mobile",
    rating: 5,
  },
  {
    id: "LOT-0002",
    product_en: "Mango",
    product_es: "Mango",
    origin: "La Libertad, El Salvador",
    harvestDate: "2026-01-03",
    batch: "BATCH-M2",
    rating: 4,
  },
  {
    id: "LOT-0003",
    product_en: "Cacao",
    product_es: "Cacao",
    origin: "Ahuachapán, El Salvador",
    harvestDate: "2026-01-04",
    batch: "BATCH-C3",
    rating: 5,
  },
  {
    id: "LOT-0004",
    product_en: "Hibiscus",
    product_es: "Flor de Jamaica",
    origin: "Sonsonate, El Salvador",
    harvestDate: "2026-01-05",
    batch: "BATCH-H4",
    rating: 4,
  },
];

export function getProductLabel(
  lot: Pick<Lot, "product_en" | "product_es">,
  lang: Lang
) {
  if (lang === "es") return lot.product_es || lot.product_en;
  return lot.product_en || lot.product_es;
}
