import { createClerkSupabaseClient } from "@/lib/supabase/client";

export const PRACTICE_DOCUMENT_CATEGORIES = [
  "Societaria",
  "Contabile",
  "Fiscale",
  "Certificazioni",
  "Finanza",
  "Lavoro",
  "Strategia",
] as const;

export type PracticeDocumentCategory =
  (typeof PRACTICE_DOCUMENT_CATEGORIES)[number];

export type PracticeDocumentRecord = {
  id: string;
  category: string;
  file_path: string | null;
  extracted_text: string | null;
  created_at: string;
};

export type PracticeGeneratedActRecord = {
  id: string;
  practice_id: string;
  document_type: string;
  title: string;
  content_markdown: string;
  version: number;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type PracticeClientRecord = {
  id: string;
  user_id: string;
  company_name: string;
  vat_number: string | null;
  address: string | null;
};

export type PracticeRecord = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  clients: PracticeClientRecord | PracticeClientRecord[] | null;
  documents: PracticeDocumentRecord[] | null;
  generated_acts: PracticeGeneratedActRecord[] | null;
};

export type PracticeDetail = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  client: PracticeClientRecord | null;
  documents: PracticeDocumentRecord[];
  generatedActs: PracticeGeneratedActRecord[];
};

function sortDocuments(documents: PracticeDocumentRecord[]) {
  return [...documents].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function sortGeneratedActs(acts: PracticeGeneratedActRecord[]) {
  return [...acts].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "active" ? -1 : 1;
    }

    if (left.document_type !== right.document_type) {
      return left.document_type.localeCompare(right.document_type);
    }

    if (left.version !== right.version) {
      return right.version - left.version;
    }

    return (
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });
}

export function normalizePracticeRecord(
  practice: PracticeRecord | null
): PracticeDetail | null {
  if (!practice) {
    return null;
  }

  const client = Array.isArray(practice.clients)
    ? practice.clients[0] ?? null
    : practice.clients;

  return {
    id: practice.id,
    type: practice.type,
    status: practice.status,
    created_at: practice.created_at,
    client,
    documents: sortDocuments(
      Array.isArray(practice.documents) ? practice.documents : []
    ),
    generatedActs: sortGeneratedActs(
      Array.isArray(practice.generated_acts) ? practice.generated_acts : []
    ),
  };
}

export async function getPracticeForCurrentUser(params: {
  practiceId: string;
  clerkToken: string | null;
}) {
  const supabase = createClerkSupabaseClient(params.clerkToken);

  const { data, error } = await supabase
    .from("practices")
    .select(
      `
        id,
        type,
        status,
        created_at,
        clients!inner (
          id,
          user_id,
          company_name,
          vat_number,
          address
        ),
        documents (
          id,
          category,
          file_path,
          extracted_text,
          created_at
        ),
        generated_acts (
          id,
          practice_id,
          document_type,
          title,
          content_markdown,
          version,
          status,
          metadata,
          created_at,
          updated_at,
          archived_at
        )
      `
    )
    .eq("id", params.practiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Lettura pratica fallita: ${error.message}`);
  }

  return normalizePracticeRecord((data as PracticeRecord | null) ?? null);
}

export function getMissingPracticeCategories(documents: PracticeDocumentRecord[]) {
  return PRACTICE_DOCUMENT_CATEGORIES.filter(
    (category) => !documents.some((document) => document.category === category)
  );
}
