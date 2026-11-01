import type { Lot } from "../../../app/lots";
import { supabase } from "../../services/supabase/client";

export type OrganizationLot = Lot & {
  organization_id: string;
  harvest_id: string;
  owner_id: string;
  is_active: boolean;
};

export type CreateLotInput = {
  id: string;
  organization_id: string;
  harvest_id: string;
  product_en: string;
  product_es: string;
  origin: string;
  harvestDate: string;
  batch: string;
  notes?: string;
  photos?: string[];
};

export type UpdateLotInput = {
  product_en?: string;
  product_es?: string;
  origin?: string;
  harvestDate?: string;
  batch?: string;
  notes?: string | null;
  photos?: string[];
  is_active?: boolean;
};

type LotRow = {
  id: string;
  organization_id: string;
  harvest_id: string;
  owner_id: string;
  product_en: string;
  product_es: string;
  origin: string;
  harvest_date: string;
  batch: string;
  notes: string | null;
  rating: number | null;
  photos: string[];
  created_at: number | string | null;
  is_active: boolean;
};

function toLot(row: LotRow): OrganizationLot {
  const createdAt =
    row.created_at === null ? undefined : Number(row.created_at);

  return {
    id: row.id,
    organization_id: row.organization_id,
    harvest_id: row.harvest_id,
    owner_id: row.owner_id,
    product_en: row.product_en,
    product_es: row.product_es,
    origin: row.origin,
    harvestDate: row.harvest_date,
    batch: row.batch,
    notes: row.notes ?? undefined,
    rating: row.rating ?? undefined,
    photos: row.photos ?? [],
    createdAt:
      createdAt !== undefined && Number.isFinite(createdAt)
        ? createdAt
        : undefined,
    is_active: row.is_active,
  };
}

function requireValue(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

export async function getLotsByOrganization(
  organizationId: string
): Promise<OrganizationLot[]> {
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("organization_id", requireValue(organizationId, "Organization"))
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as LotRow[]).map(toLot);
}

export async function getOrganizationLotById(
  organizationId: string,
  lotId: string
): Promise<OrganizationLot | null> {
  const { data, error } = await supabase
    .from("lots")
    .select("*")
    .eq("organization_id", requireValue(organizationId, "Organization"))
    .eq("id", requireValue(lotId, "Lot"))
    .maybeSingle();

  if (error) throw error;
  return data ? toLot(data as LotRow) : null;
}

export async function createOrganizationLot(
  input: CreateLotInput
): Promise<OrganizationLot> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user found.");

  const createdAt = Date.now();
  const harvestDate = requireValue(input.harvestDate, "Harvest date");

  const { data, error } = await supabase
    .from("lots")
    .insert({
      id: requireValue(input.id, "Lot ID").toUpperCase(),
      organization_id: requireValue(input.organization_id, "Organization"),
      harvest_id: requireValue(input.harvest_id, "Harvest"),
      owner_id: user.id,
      product_en: input.product_en.trim(),
      product_es: input.product_es.trim(),
      origin: requireValue(input.origin, "Origin"),
      harvest_date: harvestDate,
      harvestDate,
      batch: requireValue(input.batch, "Batch"),
      notes: input.notes?.trim() || null,
      photos: input.photos ?? [],
      created_at: createdAt,
      createdAt,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toLot(data as LotRow);
}

export async function updateOrganizationLot(
  organizationId: string,
  lotId: string,
  input: UpdateLotInput
): Promise<OrganizationLot> {
  const payload: Record<string, unknown> = {};

  if (input.product_en !== undefined) {
    payload.product_en = input.product_en.trim();
  }
  if (input.product_es !== undefined) {
    payload.product_es = input.product_es.trim();
  }
  if (input.origin !== undefined) {
    payload.origin = requireValue(input.origin, "Origin");
  }
  if (input.harvestDate !== undefined) {
    const date = requireValue(input.harvestDate, "Harvest date");
    payload.harvest_date = date;
    payload.harvestDate = date;
  }
  if (input.batch !== undefined) {
    payload.batch = requireValue(input.batch, "Batch");
  }
  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }
  if (input.photos !== undefined) payload.photos = input.photos;
  if (input.is_active !== undefined) payload.is_active = input.is_active;

  if (Object.keys(payload).length === 0) {
    throw new Error("No lot changes were provided.");
  }

  const { data, error } = await supabase
    .from("lots")
    .update(payload)
    .eq("organization_id", requireValue(organizationId, "Organization"))
    .eq("id", requireValue(lotId, "Lot"))
    .select("*")
    .single();

  if (error) throw error;
  return toLot(data as LotRow);
}
