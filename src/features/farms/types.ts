export type Farm = {
  id: string;
  organization_id: string;
  name: string;
  country: string;
  region: string | null;
  municipality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  total_area_hectares: number | null;
  description: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateFarmInput = {
  organizationId: string;
  createdBy: string;
  name: string;
  country: string;
  region?: string;
  municipality?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  totalAreaHectares?: number | null;
  description?: string;
};
