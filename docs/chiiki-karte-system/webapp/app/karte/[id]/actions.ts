"use server";

import { saveMunicipalityNote } from "@/lib/data";

export async function saveNoteAction(municipalityId: string, body: string): Promise<void> {
  await saveMunicipalityNote(municipalityId, body);
}
