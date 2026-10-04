import { supabase } from "@/src/services/supabase/client";

export type Field = {
  id: string;
  organization_id: string;
  farm_id: string;

  name: string;
  code: string | null;

  area_hectares: number | null;
  description: string | null;
  soil_type: string | null;
  elevation_meters: number | null;

  latitude: number | null;
  longitude: number | null;

  is_active: boolean;

  created_by: string;

  created_at: string;
  updated_at: string;
};

export type CreateFieldInput = {
  organization_id: string;
  farm_id: string;

  name: string;
  code?: string | null;

  area_hectares?: number | null;
  description?: string | null;
  soil_type?: string | null;
  elevation_meters?: number | null;

  latitude?: number | null;
  longitude?: number | null;
};

export type UpdateFieldInput = {
  name?: string;
  code?: string | null;

  area_hectares?: number | null;
  description?: string | null;
  soil_type?: string | null;
  elevation_meters?: number | null;

  latitude?: number | null;
  longitude?: number | null;

  is_active?: boolean;
};

export async function getFieldsByFarm(
  organizationId: string,
  farmId: string
): Promise<Field[]> {
  const { data, error } = await supabase
    .from("fields")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("farm_id", farmId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Field[];
}

export async function getActiveFieldsByFarm(
  organizationId: string,
  farmId: string
): Promise<Field[]> {
  const { data, error } = await supabase
    .from("fields")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("farm_id", farmId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Field[];
}

export async function getFieldById(
  fieldId: string
): Promise<Field | null> {
  const { data, error } = await supabase
    .from("fields")
    .select("*")
    .eq("id", fieldId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Field | null;
}

export async function createField(
  input: CreateFieldInput
): Promise<Field> {
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
    .from("fields")
    .insert({
      organization_id: input.organization_id,
      farm_id: input.farm_id,

      name: input.name.trim(),
      code: input.code?.trim() || null,

      area_hectares: input.area_hectares ?? null,
      description: input.description?.trim() || null,
      soil_type: input.soil_type?.trim() || null,
      elevation_meters: input.elevation_meters ?? null,

      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,

      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Field;
}

export async function updateField(
  fieldId: string,
  input: UpdateFieldInput
): Promise<Field> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) {
    payload.name = input.name.trim();
  }

  if (input.code !== undefined) {
    payload.code = input.code?.trim() || null;
  }

  if (input.area_hectares !== undefined) {
    payload.area_hectares = input.area_hectares;
  }

  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }

  if (input.soil_type !== undefined) {
    payload.soil_type = input.soil_type?.trim() || null;
  }

  if (input.elevation_meters !== undefined) {
    payload.elevation_meters = input.elevation_meters;
  }

  if (input.latitude !== undefined) {
    payload.latitude = input.latitude;
  }

  if (input.longitude !== undefined) {
    payload.longitude = input.longitude;
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  const { data, error } = await supabase
    .from("fields")
    .update(payload)
    .eq("id", fieldId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Field;
}

export async function setFieldActive(
  fieldId: string,
  isActive: boolean
): Promise<Field> {
  return updateField(fieldId, {
    is_active: isActive,
  });
}