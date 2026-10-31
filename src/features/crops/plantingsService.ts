import { supabase } from "@/src/services/supabase/client";

export type GrowingMethod = "perennial" | "cycle";

export type Planting = {
  id: string;
  organization_id: string;
  field_id: string;
  crop_type_id: string;
  name: string;
  variety: string | null;
  growing_method: GrowingMethod;
  established_on: string | null;
  ended_on: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreatePlantingInput = {
  organization_id: string;
  field_id: string;
  crop_type_id: string;
  name: string;
  variety?: string | null;
  growing_method: GrowingMethod;
  established_on?: string | null;
  ended_on?: string | null;
  notes?: string | null;
};

export type UpdatePlantingInput = {
  name?: string;
  variety?: string | null;
  growing_method?: GrowingMethod;
  established_on?: string | null;
  ended_on?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

function cleanPlantingName(name: string): string {
  const cleaned = name.trim();

  if (!cleaned) {
    throw new Error("Planting name is required.");
  }

  return cleaned;
}

function validateGrowingMethod(
  value: GrowingMethod
): GrowingMethod {
  if (value !== "perennial" && value !== "cycle") {
    throw new Error("Growing method must be perennial or cycle.");
  }

  return value;
}

function cleanDate(
  value: string | null | undefined
): string | null {
  const cleaned = value?.trim();

  if (!cleaned) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  const parsed = new Date(`${cleaned}T00:00:00.000Z`);

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== cleaned ||
    cleaned.startsWith("0000-")
  ) {
    throw new Error("Enter a valid calendar date.");
  }

  return cleaned;
}

function validateDateOrder(
  establishedOn: string | null | undefined,
  endedOn: string | null | undefined
): void {
  if (establishedOn && endedOn && endedOn < establishedOn) {
    throw new Error(
      "End date cannot be earlier than the establishment date."
    );
  }
}

export async function getPlantingsByField(
  organizationId: string,
  fieldId: string
): Promise<Planting[]> {
  const { data, error } = await supabase
    .from("plantings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("field_id", fieldId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Planting[];
}

export async function getActivePlantingsByField(
  organizationId: string,
  fieldId: string
): Promise<Planting[]> {
  const { data, error } = await supabase
    .from("plantings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("field_id", fieldId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Planting[];
}

export async function getPlantingById(
  organizationId: string,
  plantingId: string
): Promise<Planting | null> {
  const { data, error } = await supabase
    .from("plantings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", plantingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Planting | null;
}

export async function createPlanting(
  input: CreatePlantingInput
): Promise<Planting> {
  const name = cleanPlantingName(input.name);
  const growingMethod = validateGrowingMethod(input.growing_method);
  const establishedOn = cleanDate(input.established_on);
  const endedOn = cleanDate(input.ended_on);

  validateDateOrder(establishedOn, endedOn);

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
    .from("plantings")
    .insert({
      organization_id: input.organization_id,
      field_id: input.field_id,
      crop_type_id: input.crop_type_id,
      name,
      variety: input.variety?.trim() || null,
      growing_method: growingMethod,
      established_on: establishedOn,
      ended_on: endedOn,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Planting;
}

export async function updatePlanting(
  organizationId: string,
  plantingId: string,
  input: UpdatePlantingInput
): Promise<Planting> {
  const payload: UpdatePlantingInput = {};

  if (input.name !== undefined) {
    payload.name = cleanPlantingName(input.name);
  }

  if (input.variety !== undefined) {
    payload.variety = input.variety?.trim() || null;
  }

  if (input.growing_method !== undefined) {
    payload.growing_method = validateGrowingMethod(
      input.growing_method
    );
  }

  if (input.established_on !== undefined) {
    payload.established_on = cleanDate(input.established_on);
  }

  if (input.ended_on !== undefined) {
    payload.ended_on = cleanDate(input.ended_on);
  }

  if (input.notes !== undefined) {
    payload.notes = input.notes?.trim() || null;
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No planting changes provided.");
  }

  // Validate together when both dates are supplied.
  // The database also checks the final row for partial updates.
  validateDateOrder(payload.established_on, payload.ended_on);

  const { data, error } = await supabase
    .from("plantings")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", plantingId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Planting;
}

export async function setPlantingActive(
  organizationId: string,
  plantingId: string,
  isActive: boolean
): Promise<Planting> {
  return updatePlanting(organizationId, plantingId, {
    is_active: isActive,
  });
}
