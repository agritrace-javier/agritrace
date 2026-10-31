import { supabase } from "@/src/services/supabase/client";

export type HarvestUnit = "kg" | "g" | "lb";

export type Harvest = {
  id: string;
  organization_id: string;
  planting_id: string;
  name: string;
  harvest_date: string;
  quantity: number;
  unit: HarvestUnit;
  notes: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateHarvestInput = {
  organization_id: string;
  planting_id: string;
  name: string;
  harvest_date: string;
  quantity: number;
  unit: HarvestUnit;
  notes?: string | null;
};

export type UpdateHarvestInput = {
  name?: string;
  harvest_date?: string;
  quantity?: number;
  unit?: HarvestUnit;
  notes?: string | null;
  is_active?: boolean;
};

function cleanName(value: string): string {
  const name = value.trim();

  if (!name) {
    throw new Error("Harvest name is required.");
  }

  return name;
}

function cleanHarvestDate(value: string): string {
  const date = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Harvest date must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    date.startsWith("0000-")
  ) {
    throw new Error("Enter a valid harvest date.");
  }

  return date;
}

function validateQuantity(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Quantity must be a number greater than zero.");
  }

  if (value > 99999999999.999) {
    throw new Error("Quantity exceeds the supported maximum.");
  }

  if (Number(value.toFixed(3)) !== value) {
    throw new Error("Quantity supports up to three decimal places.");
  }

  return value;
}

function validateUnit(value: HarvestUnit): HarvestUnit {
  if (value !== "kg" && value !== "g" && value !== "lb") {
    throw new Error("Unit must be kg, g or lb.");
  }

  return value;
}

export async function getHarvestsByPlanting(
  organizationId: string,
  plantingId: string
): Promise<Harvest[]> {
  const { data, error } = await supabase
    .from("harvests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("planting_id", plantingId)
    .order("harvest_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Harvest[];
}

export async function getHarvestById(
  organizationId: string,
  harvestId: string
): Promise<Harvest | null> {
  const { data, error } = await supabase
    .from("harvests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", harvestId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Harvest | null;
}

export async function createHarvest(
  input: CreateHarvestInput
): Promise<Harvest> {
  const name = cleanName(input.name);
  const harvestDate = cleanHarvestDate(input.harvest_date);
  const quantity = validateQuantity(input.quantity);
  const unit = validateUnit(input.unit);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("harvests")
    .insert({
      organization_id: input.organization_id,
      planting_id: input.planting_id,
      name,
      harvest_date: harvestDate,
      quantity,
      unit,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Harvest;
}

export async function updateHarvest(
  organizationId: string,
  harvestId: string,
  input: UpdateHarvestInput
): Promise<Harvest> {
  const payload: UpdateHarvestInput = {};

  if (input.name !== undefined) {
    payload.name = cleanName(input.name);
  }

  if (input.harvest_date !== undefined) {
    payload.harvest_date = cleanHarvestDate(input.harvest_date);
  }

  if (input.quantity !== undefined) {
    payload.quantity = validateQuantity(input.quantity);
  }

  if (input.unit !== undefined) {
    payload.unit = validateUnit(input.unit);
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No harvest changes provided.");
  }

  const { data, error } = await supabase
    .from("harvests")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", harvestId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Harvest;
}

export async function setHarvestActive(
  organizationId: string,
  harvestId: string,
  isActive: boolean
): Promise<Harvest> {
  return updateHarvest(organizationId, harvestId, {
    is_active: isActive,
  });
}
