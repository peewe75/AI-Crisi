import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PRACTICE_DOCUMENTS_BUCKET = "practice_documents";

type DocumentAccessRow = {
  id: string;
  file_path: string | null;
  category: string;
  practices:
    | {
        id: string;
        clients:
          | {
              user_id: string;
              company_name: string | null;
            }
          | Array<{
              user_id: string;
              company_name: string | null;
            }>
          | null;
      }
    | Array<{
        id: string;
        clients:
          | {
              user_id: string;
              company_name: string | null;
            }
          | Array<{
              user_id: string;
              company_name: string | null;
            }>
          | null;
      }>
    | null;
};

export type AccessiblePracticeDocument = {
  id: string;
  category: string;
  filePath: string;
  filename: string;
  contentType: string;
  ownerUserId: string;
  companyName: string | null;
};

function getContentType(filePath: string) {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lowerPath.endsWith(".md") || lowerPath.endsWith(".markdown")) {
    return "text/markdown; charset=utf-8";
  }

  if (lowerPath.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
  }

  return "application/octet-stream";
}

function getFilename(filePath: string) {
  return filePath.split("/").pop() ?? "documento";
}

export function getPracticeDocumentsBucket() {
  return PRACTICE_DOCUMENTS_BUCKET;
}

export async function getAccessiblePracticeDocument(params: {
  documentId: string;
  userId: string;
  isAdmin: boolean;
}) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      `
        id,
        file_path,
        category,
        practices!inner (
          id,
          clients!inner (
            user_id,
            company_name
          )
        )
      `
    )
    .eq("id", params.documentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Lettura documento fallita: ${error.message}`);
  }

  const document = data as DocumentAccessRow | null;

  if (!document?.file_path) {
    return null;
  }

  const practice = Array.isArray(document.practices)
    ? document.practices[0] ?? null
    : document.practices;
  const client = Array.isArray(practice?.clients)
    ? practice.clients[0] ?? null
    : practice?.clients;

  if (!client?.user_id) {
    return null;
  }

  if (!params.isAdmin && client.user_id !== params.userId) {
    return null;
  }

  return {
    id: document.id,
    category: document.category,
    filePath: document.file_path,
    filename: getFilename(document.file_path),
    contentType: getContentType(document.file_path),
    ownerUserId: client.user_id,
    companyName: client.company_name ?? null,
  } satisfies AccessiblePracticeDocument;
}
