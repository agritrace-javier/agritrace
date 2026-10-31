import { supabase } from "@/src/services/supabase/client";

export type CropType = {
  id: string;
  organization_id: string;
  name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateCropTypeInput = {
  organization_id: string;
  name: string;
};

export type UpdateCropTypeInput = {
  name?: string;
  is_active?: boolean;
};

function cleanCropTypeName(name: string): string {
  const cleaned = name.trim();

  if (!cleaned) {
    throw new Error("Crop type name is required.");
  }

  return cleaned;
}

export async function getCropTypesByOrganization(
  organizationId: string
): Promise<CropType[]> {
  const { data, error } = await supabase
    .from("crop_types")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CropType[];
}

export async function getActiveCropTypesByOrganization(
  organizationId: string
): Promise<CropType[]> {
  const { data, error } = await supabase
    .from("crop_types")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CropType[];
}

export async function createCropType(
  input: CreateCropTypeInput
): Promise<CropType> {
  const name = cleanCropTypeName(input.name);

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
    .from("crop_types")
    .insert({
      organization_id: input.organization_id,
      name,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as CropType;
}

export async function updateCropType(
  organizationId: string,
  cropTypeId: string,
  input: UpdateCropTypeInput
): Promise<CropType> {
  const payload: UpdateCropTypeInput = {};

  if (input.name !== undefined) {
    payload.name = cleanCropTypeName(input.name);
  }

  if (input.is_active !== undefined) {
    payload.is_active = input.is_active;
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No crop type changes provided.");
  }

  const { data, error } = await supabase
    .from("crop_types")
    .update(payload)
    .eq("organization_id", organizationId)
    .eq("id", cropTypeId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as CropType;
}

export async function setCropTypeActive(
  organizationId: string,
  cropTypeId: string,
  isActive: boolean
): Promise<CropType> {
  return updateCropType(organizationId, cropTypeId, {
    is_active: isActive,
  });
}
