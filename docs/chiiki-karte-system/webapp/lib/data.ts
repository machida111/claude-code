import { getSupabaseClient } from "./supabaseClient";
import { Municipality, MunicipalityNote, Region } from "./types";

interface MunicipalityRow {
  id: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
  population: number;
  pop_change_rate: number;
  aging_rate: number;
  area_km2: number;
  households: number;
  fiscal_index: number;
}

function rowToMunicipality(row: MunicipalityRow): Municipality {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    lat: row.lat,
    lng: row.lng,
    population: row.population,
    popChangeRate: Number(row.pop_change_rate),
    agingRate: Number(row.aging_rate),
    areaKm2: Number(row.area_km2),
    households: row.households,
    fiscalIndex: Number(row.fiscal_index),
  };
}

export async function getMunicipalities(): Promise<Municipality[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("municipalities")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`市町村データの取得に失敗しました: ${error.message}`);
  }
  return (data as MunicipalityRow[]).map(rowToMunicipality);
}

export async function getMunicipality(id: string): Promise<Municipality | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("municipalities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`市町村データの取得に失敗しました: ${error.message}`);
  }
  return data ? rowToMunicipality(data as MunicipalityRow) : null;
}

export async function getMunicipalityNote(id: string): Promise<MunicipalityNote | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("municipality_notes")
    .select("*")
    .eq("municipality_id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`担当者メモの取得に失敗しました: ${error.message}`);
  }
  if (!data) return null;
  return {
    municipalityId: data.municipality_id,
    body: data.body,
    updatedAt: data.updated_at,
  };
}

export async function saveMunicipalityNote(id: string, body: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("municipality_notes")
    .upsert({ municipality_id: id, body }, { onConflict: "municipality_id" });

  if (error) {
    throw new Error(`担当者メモの保存に失敗しました: ${error.message}`);
  }
}
