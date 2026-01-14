// app/lots.ts
import type { Lang } from "./i18n";

/**
 * Canonical Lot model for AgriTrace.
 * - product_en / product_es are strings (can be custom like "Papaya")
 * - createdAt/photos are optional for backward compatibility
 */
export type Lot = {
  id: string;
  product_en: string;
  product_es: string;
  origin: string;
  harvestDate: string; // YYYY-MM-DD
  batch: string;
  notes?: string;

  rating?: number; // 1..5 (optional)

  createdAt?: number; // timestamp ms
  photos?: string[]; // uploaded photo URIs
};

/**
 * Demo lots (seed). The app must work with ANY custom product too
 * (e.g., Papaya) without needing to edit this list.
 */
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
    createdAt: Date.parse("2026-01-02T00:00:00Z"),
    photos: [],
  },
  {
    id: "LOT-0002",
    product_en: "Mango",
    product_es: "Mango",
    origin: "La Libertad, El Salvador",
    harvestDate: "2026-01-03",
    batch: "BATCH-M2",
    rating: 4,
    createdAt: Date.parse("2026-01-03T00:00:00Z"),
    photos: [],
  },
  {
    id: "LOT-0003",
    product_en: "Cacao",
    product_es: "Cacao",
    origin: "Ahuachapán, El Salvador",
    harvestDate: "2026-01-04",
    batch: "BATCH-C3",
    rating: 5,
    createdAt: Date.parse("2026-01-04T00:00:00Z"),
    photos: [],
  },
  {
    id: "LOT-0004",
    product_en: "Hibiscus",
    product_es: "Flor de Jamaica",
    origin: "Sonsonate, El Salvador",
    harvestDate: "2026-01-05",
    batch: "BATCH-H4",
    rating: 4,
    createdAt: Date.parse("2026-01-05T00:00:00Z"),
    photos: [],
  },
];

/**
 * Always returns a readable product label.
 * Works for any custom product like "Papaya".
 */
export function getProductLabel(
  lot: Pick<Lot, "product_en" | "product_es">,
  lang: Lang
) {
  const en = String(lot.product_en ?? "").trim();
  const es = String(lot.product_es ?? "").trim();

  if (lang === "es") return es || en || "—";
  return en || es || "—";
}

/**
 * Optional helper: stable product key for mapping thumbnails/demo photos.
 * Example output: "papaya" / "coffee-beans"
 */
export function getProductKey(
  lot: Pick<Lot, "product_en" | "product_es">
): string {
  const raw = String(lot.product_en || lot.product_es || "").trim().toLowerCase();
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
