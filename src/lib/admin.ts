import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PracticeDocumentRecord, PracticeGeneratedActRecord } from "@/lib/practices";

type SessionClaimsLike = {
  metadata?: { role?: string | null } | null;
  public_metadata?: { role?: string | null } | null;
  private_metadata?: { role?: string | null } | null;
  user_metadata?: { role?: string | null } | null;
  [key: string]: unknown;
} | null | undefined;

type ClerkUserLike = {
  publicMetadata?: { role?: string | null } | null;
  privateMetadata?: { role?: string | null } | null;
  unsafeMetadata?: { role?: string | null } | null;
} | null;

export type AdminPracticeListItem = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  client: {
    id: string;
    company_name: string;
    vat_number: string | null;
    address: string | null;
    user_id: string;
  } | null;
  documents: Pick<PracticeDocumentRecord, "id" | "category" | "extracted_text">[];
};

export type AdminPracticeSort =
  | "created_at_desc"
  | "created_at_asc"
  | "company_name_asc"
  | "company_name_desc"
  | "status_asc"
  | "status_desc";

export type AdminExtractedTextFilter =
  | "all"
  | "with_extracted_text"
  | "without_extracted_text";

export type AdminPracticeListPage = {
  items: AdminPracticeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminPracticeDetail = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  client: {
    id: string;
    company_name: string;
    vat_number: string | null;
    address: string | null;
    user_id: string;
  } | null;
  documents: PracticeDocumentRecord[];
  generatedActs: PracticeGeneratedActRecord[];
};

export type AdminKnowledgeBaseItem = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  metadata: {
    source_file?: string | null;
    ingest_mode?: string | null;
  } | null;
};

export type AdminBackgroundSyncRun = {
  id: string;
  job_name: string;
  status: "running" | "success" | "skipped_interval" | "failed";
  started_at: string;
  finished_at: string | null;
  inserted_count: number;
  skipped_count: number;
  failed_count: number;
  metadata: {
    source_url?: string | null;
    fetched_count?: number | null;
    pending_count?: number | null;
    last_successful_sync_at?: string | null;
    next_eligible_sync_at?: string | null;
    reason?: string | null;
    error?: string | null;
  } | null;
};

export type AdminBackgroundSyncRunPage = {
  items: AdminBackgroundSyncRun[];
  total: number;
  latestSuccessAt: string | null;
  nextEligibleSyncAt: string | null;
};

function getAdminRole(sessionClaims: SessionClaimsLike) {
  return (
    sessionClaims?.metadata?.role ??
    sessionClaims?.public_metadata?.role ??
    sessionClaims?.private_metadata?.role ??
    sessionClaims?.user_metadata?.role ??
    null
  );
}

function getAdminRoleFromUser(user: ClerkUserLike) {
  return (
    user?.publicMetadata?.role ??
    user?.privateMetadata?.role ??
    user?.unsafeMetadata?.role ??
    null
  );
}

export function isAdminSession(sessionClaims: SessionClaimsLike) {
  return getAdminRole(sessionClaims) === "admin";
}

async function resolveIsAdmin(sessionClaims: SessionClaimsLike) {
  if (isAdminSession(sessionClaims)) {
    return true;
  }

  const user = await currentUser();
  return getAdminRoleFromUser(user as ClerkUserLike) === "admin";
}

export async function isCurrentUserAdmin() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return false;
  }

  return resolveIsAdmin(sessionClaims as SessionClaimsLike);
}

export async function requireAdminAccess() {
  const { userId, sessionClaims } = await auth();

  if (!userId || !(await resolveIsAdmin(sessionClaims as SessionClaimsLike))) {
    redirect("/");
  }

  return { userId, sessionClaims };
}

export async function assertAdminApiAccess() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return {
      ok: false as const,
      status: 401,
      error: "Utente non autenticato.",
    };
  }

  if (!(await resolveIsAdmin(sessionClaims as SessionClaimsLike))) {
    return {
      ok: false as const,
      status: 403,
      error: "Accesso riservato agli amministratori.",
    };
  }

  return {
    ok: true as const,
    userId,
    sessionClaims,
  };
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function intersectIdGroups(groups: Array<string[] | null>) {
  const activeGroups = groups.filter(
    (group): group is string[] => Array.isArray(group)
  );

  if (activeGroups.length === 0) {
    return null;
  }

  return activeGroups.reduce((accumulator, group) => {
    const current = new Set(group);
    return accumulator.filter((id) => current.has(id));
  });
}

function mapPracticeListItems(
  data: Array<{
    id: string;
    type: string;
    status: string;
    created_at: string;
    clients:
      | {
          id: string;
          company_name: string;
          vat_number: string | null;
          address: string | null;
          user_id: string;
        }
      | Array<{
          id: string;
          company_name: string;
          vat_number: string | null;
          address: string | null;
          user_id: string;
        }>
      | null;
    documents:
      | Array<{
          id: string;
          category: string;
          extracted_text: string | null;
        }>
      | null;
  }>
): AdminPracticeListItem[] {
  return data.map((practice) => ({
    id: practice.id,
    type: practice.type,
    status: practice.status,
    created_at: practice.created_at,
    client: Array.isArray(practice.clients)
      ? practice.clients[0] ?? null
      : practice.clients,
    documents: Array.isArray(practice.documents) ? practice.documents : [],
  }));
}

async function getSearchMatchedPracticeIds(
  search: string
): Promise<string[] | null> {
  if (!search) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const pattern = `%${search}%`;

  const [clientResponse, practiceResponse] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .or(`company_name.ilike.${pattern},vat_number.ilike.${pattern}`),
    supabase
      .from("practices")
      .select("id")
      .or(`type.ilike.${pattern},status.ilike.${pattern}`),
  ]);

  if (clientResponse.error) {
    throw new Error(
      `Ricerca CRM clienti fallita: ${clientResponse.error.message}`
    );
  }

  if (practiceResponse.error) {
    throw new Error(
      `Ricerca CRM pratiche fallita: ${practiceResponse.error.message}`
    );
  }

  const clientIds = uniqueIds((clientResponse.data ?? []).map((client) => client.id));
  const directPracticeIds = uniqueIds(
    (practiceResponse.data ?? []).map((practice) => practice.id)
  );

  let clientPracticeIds: string[] = [];

  if (clientIds.length > 0) {
    const clientPracticeResponse = await supabase
      .from("practices")
      .select("id")
      .in("client_id", clientIds);

    if (clientPracticeResponse.error) {
      throw new Error(
        `Ricerca pratiche per cliente fallita: ${clientPracticeResponse.error.message}`
      );
    }

    clientPracticeIds = uniqueIds(
      (clientPracticeResponse.data ?? []).map((practice) => practice.id)
    );
  }

  return uniqueIds([...directPracticeIds, ...clientPracticeIds]);
}

async function getDocumentMatchedPracticeIds(params: {
  documentCategory: string;
  extractedText: AdminExtractedTextFilter;
}): Promise<string[] | null> {
  if (!params.documentCategory && params.extractedText === "all") {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("documents").select("practice_id");

  if (params.documentCategory) {
    query = query.eq("category", params.documentCategory);
  }

  if (params.extractedText === "with_extracted_text") {
    query = query.not("extracted_text", "is", null).neq("extracted_text", "");
  } else if (params.extractedText === "without_extracted_text") {
    query = query.or("extracted_text.is.null,extracted_text.eq.");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Filtro documenti admin fallito: ${error.message}`);
  }

  return uniqueIds((data ?? []).map((document) => document.practice_id));
}

export async function listAdminPractices(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  documentCategory?: string;
  extractedText?: AdminExtractedTextFilter;
  sort?: AdminPracticeSort;
}): Promise<AdminPracticeListPage> {
  const supabase = getSupabaseAdminClient();
  const pageSize = Math.min(Math.max(params?.pageSize ?? 25, 1), 100);
  const page = Math.max(params?.page ?? 1, 1);
  const search = params?.search?.trim().toLowerCase() ?? "";
  const documentCategory = params?.documentCategory?.trim() ?? "";
  const extractedText = params?.extractedText ?? "all";
  const sort = params?.sort ?? "created_at_desc";
  const [searchMatchedPracticeIds, documentMatchedPracticeIds] =
    await Promise.all([
      getSearchMatchedPracticeIds(search),
      getDocumentMatchedPracticeIds({
        documentCategory,
        extractedText,
      }),
    ]);

  const candidatePracticeIds = intersectIdGroups([
    searchMatchedPracticeIds,
    documentMatchedPracticeIds,
  ]);

  if (candidatePracticeIds && candidatePracticeIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  if (sort === "company_name_asc" || sort === "company_name_desc") {
    let clientIds: string[] | null = null;

    if (candidatePracticeIds) {
      const { data: practiceRows, error: practiceRowsError } = await supabase
        .from("practices")
        .select("id, client_id")
        .in("id", candidatePracticeIds);

      if (practiceRowsError) {
        throw new Error(
          `Lettura client_id pratiche fallita: ${practiceRowsError.message}`
        );
      }

      clientIds = uniqueIds(
        (practiceRows ?? []).map((practice) => practice.client_id)
      );

      if (clientIds.length === 0) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize,
          totalPages: 1,
        };
      }
    }

    let clientQuery = supabase.from("clients").select(
      `
        id,
        company_name,
        vat_number,
        address,
        user_id,
        practices!inner (
          id,
          type,
          status,
          created_at,
          documents (
            id,
            category,
            extracted_text
          )
        )
      `,
      { count: "exact" }
    );

    if (clientIds) {
      clientQuery = clientQuery.in("id", clientIds);
    }

    clientQuery = clientQuery
      .order("company_name", {
        ascending: sort === "company_name_asc",
      })
      .range(start, end);

    const { data, error, count } = await clientQuery;

    if (error) {
      throw new Error(
        `Lettura CRM pratiche per azienda fallita: ${error.message}`
      );
    }

    const mappedItems: Array<AdminPracticeListItem | null> = (data ?? [])
      .map((client) => {
        const practice = Array.isArray(client.practices)
          ? client.practices[0]
          : client.practices;

        if (!practice) {
          return null;
        }

        return {
          id: practice.id,
          type: practice.type,
          status: practice.status,
          created_at: practice.created_at,
          client: {
            id: client.id,
            company_name: client.company_name,
            vat_number: client.vat_number,
            address: client.address,
            user_id: client.user_id,
          },
          documents: Array.isArray(practice.documents) ? practice.documents : [],
        } satisfies AdminPracticeListItem;
      });
    const items = mappedItems.filter(Boolean) as AdminPracticeListItem[];
    const total = count ?? items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page: Math.min(page, totalPages),
      pageSize,
      totalPages,
    };
  }

  let practiceQuery = supabase.from("practices").select(
    `
      id,
      type,
      status,
      created_at,
      clients (
        id,
        company_name,
        vat_number,
        address,
        user_id
      ),
      documents (
        id,
        category,
        extracted_text
      )
    `,
    { count: "exact" }
  );

  if (candidatePracticeIds) {
    practiceQuery = practiceQuery.in("id", candidatePracticeIds);
  }

  if (sort === "created_at_asc") {
    practiceQuery = practiceQuery.order("created_at", { ascending: true });
  } else if (sort === "status_asc") {
    practiceQuery = practiceQuery
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
  } else if (sort === "status_desc") {
    practiceQuery = practiceQuery
      .order("status", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    practiceQuery = practiceQuery.order("created_at", { ascending: false });
  }

  const { data, error, count } = await practiceQuery.range(start, end);

  if (error) {
    throw new Error(`Lettura CRM pratiche fallita: ${error.message}`);
  }

  const items = mapPracticeListItems(
    (data ?? []) as Parameters<typeof mapPracticeListItems>[0]
  );
  const total = count ?? items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
  };
}

export async function getAdminPracticeDetail(practiceId: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("practices")
    .select(
      `
        id,
        type,
        status,
        created_at,
        clients (
          id,
          company_name,
          vat_number,
          address,
          user_id
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
    .eq("id", practiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Lettura pratica admin fallita: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const client = Array.isArray(data.clients) ? data.clients[0] ?? null : data.clients;
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const generatedActs = Array.isArray(data.generated_acts)
    ? [...data.generated_acts].sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime()
      )
    : [];

  return {
    id: data.id,
    type: data.type,
    status: data.status,
    created_at: data.created_at,
    client,
    documents,
    generatedActs,
  } as AdminPracticeDetail;
}

export async function listLatestKnowledgeBaseEntries(params?: { limit?: number }) {
  const supabase = getSupabaseAdminClient();
  const limit = Math.min(Math.max(params?.limit ?? 10, 1), 50);

  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, category, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Lettura knowledge base admin fallita: ${error.message}`);
  }

  return (data ?? []) as AdminKnowledgeBaseItem[];
}

export async function listAdminBackgroundSyncRuns(params?: {
  jobName?: string;
  limit?: number;
}): Promise<AdminBackgroundSyncRunPage> {
  const supabase = getSupabaseAdminClient();
  const limit = Math.min(Math.max(params?.limit ?? 20, 1), 100);
  const jobName = params?.jobName?.trim() || "sync-giurisprudenza-ilcaso";

  const [runsResponse, latestSuccessResponse] = await Promise.all([
    supabase
      .from("background_sync_runs")
      .select(
        "id, job_name, status, started_at, finished_at, inserted_count, skipped_count, failed_count, metadata",
        { count: "exact" }
      )
      .eq("job_name", jobName)
      .order("started_at", { ascending: false })
      .limit(limit),
    supabase
      .from("background_sync_runs")
      .select("finished_at")
      .eq("job_name", jobName)
      .eq("status", "success")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (runsResponse.error) {
    throw new Error(
      `Lettura run di sincronizzazione fallita: ${runsResponse.error.message}`
    );
  }

  if (latestSuccessResponse.error) {
    throw new Error(
      `Lettura ultimo run riuscito fallita: ${latestSuccessResponse.error.message}`
    );
  }

  const latestSuccessAt = latestSuccessResponse.data?.finished_at ?? null;
  const nextEligibleSyncAt = latestSuccessAt
    ? new Date(
        new Date(latestSuccessAt).getTime() + 48 * 60 * 60 * 1000
      ).toISOString()
    : null;

  return {
    items: (runsResponse.data ?? []) as AdminBackgroundSyncRun[],
    total: runsResponse.count ?? 0,
    latestSuccessAt,
    nextEligibleSyncAt,
  };
}

