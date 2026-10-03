import { supabase } from "../../services/supabase";

import type {
  CreateFarmInput,
  Farm,
} from "./types";

export async function getFarms(
  organizationId: string
): Promise<Farm[]> {
  const { data, error } = await supabase
    .from("farms")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as Farm[];
}

export async function createFarm(
  input: CreateFarmInput
): Promise<Farm> {
  const name = input.name.trim();
  const country = input.country.trim();

  if (!name) {
    throw new Error("Farm name is required.");
  }

  if (!country) {
    throw new Error("Country is required.");
  }

  const { data, error } = await supabase
    .from("farms")
    .insert({
      organization_id: input.organizationId,
      created_by: input.createdBy,
      name,
      country,
      region: input.region?.trim() || null,
      municipality:
        input.municipality?.trim() || null,
      address: input.address?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      total_area_hectares:
        input.totalAreaHectares ?? null,
      description:
        input.description?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Farm;
}
