import { supabase } from "../../services/supabase/client";

export type PublicLot = {
  id: string;
  product_en: string;
  product_es: string;
  origin: string;
  harvest_date: string;
  batch: string;
  photos: string[];
};

export async function getPublicLot(
  lotId: string
): Promise<PublicLot | null> {
  const id = lotId.trim().toUpperCase();

  if (!/^LOT-[A-Z0-9-]{1,123}$/.test(id)) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_public_lot", {
    p_lot_id: id,
  });

  if (error) {
    throw error;
  }

  const rows = data as PublicLot[] | null;
  const lot = rows?.[0];

  if (!lot) {
    return null;
  }

  return {
    id: lot.id,
    product_en: lot.product_en,
    product_es: lot.product_es,
    origin: lot.origin,
    harvest_date: lot.harvest_date,
    batch: lot.batch,
    photos: Array.isArray(lot.photos)
      ? lot.photos
          .filter(
            (uri): uri is string =>
              typeof uri === "string" &&
              /^https?:\/\//i.test(uri)
          )
          .slice(0, 12)
      : [],
  };
}
