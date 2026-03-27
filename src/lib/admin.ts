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
    source_url?: string | null;
    source_id?: string | null;
  } | null;
};

export type KnowledgeBaseArchiveCategory = "Giurisprudenza" | "Normativa" | "Template" | "Skill";
export type KnowledgeBaseArchiveOriginFilter = "all" | "manual" | "cron-sync";

export type AdminKnowledgeBaseArchive = {
  items: AdminKnowledgeBaseItem[];
  total: number;
  search: string;
  origin: KnowledgeBaseArchiveOriginFilter;
  countsByCategory: Record<KnowledgeBaseArchiveCategory, number>;
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
  page: number;
  pageSize: number;
  totalPages: number;
  latestRun: AdminBackgroundSyncRun | null;
  latestSuccessAt: string | null;
  nextEligibleSyncAt: string | null;
};

export type AdminBackgroundSyncStatusFilter =
  | "all"
  | "running"
  | "success"
  | "skipped_interval"
  | "failed";

export type AdminBackgroundSyncDateFilter = "all" | "today" | "7d" | "30d";

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

export async function listLatestKnowledgeBaseEntries(params?: {
  limit?: number;
  search?: string;
  origin?: KnowledgeBaseArchiveOriginFilter;
}): Promise<AdminKnowledgeBaseArchive> {
  const supabase = getSupabaseAdminClient();
  const limit = Math.min(Math.max(params?.limit ?? 10, 1), 50);
  const search = params?.search?.trim() ?? "";
  const origin = params?.origin ?? "all";
  const searchPattern = `%${search}%`;
  const categories: KnowledgeBaseArchiveCategory[] = [
    "Giurisprudenza",
    "Normativa",
    "Template",
    "Skill",
  ];

  let itemsQuery = supabase
    .from("knowledge_base")
    .select("id, title, category, created_at, metadata", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    itemsQuery = itemsQuery.or(
      `title.ilike.${searchPattern},content.ilike.${searchPattern}`
    );
  }

  if (origin === "cron-sync") {
    itemsQuery = itemsQuery.eq("metadata->>ingest_mode", "cron-sync");
  } else if (origin === "manual") {
    itemsQuery = itemsQuery.or(
      "metadata->>ingest_mode.is.null,metadata->>ingest_mode.neq.cron-sync"
    );
  }

  const countQueries = categories.map((category) => {
    let query = supabase
      .from("knowledge_base")
      .select("id", { count: "exact", head: true })
      .eq("category", category);

    if (search) {
      query = query.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);
    }

    if (origin === "cron-sync") {
      query = query.eq("metadata->>ingest_mode", "cron-sync");
    } else if (origin === "manual") {
      query = query.or(
        "metadata->>ingest_mode.is.null,metadata->>ingest_mode.neq.cron-sync"
      );
    }

    return query;
  });

  const [itemsResponse, ...countResponses] = await Promise.all([
    itemsQuery,
    ...countQueries,
  ]);

  const { data, error, count } = itemsResponse;

  if (error) {
    throw new Error(`Lettura knowledge base admin fallita: ${error.message}`);
  }

  const countsByCategory = categories.reduce(
    (accumulator, category, index) => {
      const response = countResponses[index];

      if (response.error) {
        throw new Error(
          `Conteggio knowledge base per categoria fallito: ${response.error.message}`
        );
      }

      accumulator[category] = response.count ?? 0;
      return accumulator;
    },
    {
      Giurisprudenza: 0,
      Normativa: 0,
      Template: 0,
      Skill: 0,
    } satisfies Record<KnowledgeBaseArchiveCategory, number>
  );

  return {
    items: (data ?? []) as AdminKnowledgeBaseItem[],
    total: count ?? 0,
    search,
    origin,
    countsByCategory,
  };
}

export async function listAdminBackgroundSyncRuns(params?: {
  jobName?: string;
  page?: number;
  pageSize?: number;
  status?: AdminBackgroundSyncStatusFilter;
  dateRange?: AdminBackgroundSyncDateFilter;
}): Promise<AdminBackgroundSyncRunPage> {
  const supabase = getSupabaseAdminClient();
  const pageSize = Math.min(Math.max(params?.pageSize ?? 15, 1), 100);
  const page = Math.max(params?.page ?? 1, 1);
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const jobName = params?.jobName?.trim() || "sync-giurisprudenza-ilcaso";
  const status = params?.status ?? "all";
  const dateRange = params?.dateRange ?? "all";
  const now = new Date();
  let startDate: string | null = null;

  if (dateRange === "today") {
    startDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ).toISOString();
  } else if (dateRange === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (dateRange === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  let runsQuery = supabase
    .from("background_sync_runs")
    .select(
      "id, job_name, status, started_at, finished_at, inserted_count, skipped_count, failed_count, metadata",
      { count: "exact" }
    )
    .eq("job_name", jobName)
    .order("started_at", { ascending: false })
    .range(start, end);

  if (status !== "all") {
    runsQuery = runsQuery.eq("status", status);
  }

  if (startDate) {
    runsQuery = runsQuery.gte("started_at", startDate);
  }

  let latestRunQuery = supabase
    .from("background_sync_runs")
    .select(
      "id, job_name, status, started_at, finished_at, inserted_count, skipped_count, failed_count, metadata"
    )
    .eq("job_name", jobName)
    .order("started_at", { ascending: false })
    .limit(1);

  if (startDate) {
    latestRunQuery = latestRunQuery.gte("started_at", startDate);
  }

  const latestRunPromise = latestRunQuery.maybeSingle();

  const [runsResponse, latestRunResponse, latestSuccessResponse] = await Promise.all([
    runsQuery,
    latestRunPromise,
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

  if (latestRunResponse.error) {
    throw new Error(
      `Lettura ultimo run fallita: ${latestRunResponse.error.message}`
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
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((runsResponse.count ?? 0) / pageSize)),
    latestRun: (latestRunResponse.data as AdminBackgroundSyncRun | null) ?? null,
    latestSuccessAt,
    nextEligibleSyncAt,
  };
}

export type AdminOverviewStats = {
  totalPractices: number;
  totalDocuments: number;
  documentsWithoutText: number;
  latestPractices: AdminPracticeListItem[];
};

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const supabase = getSupabaseAdminClient();
  
  const [
    { count: totalPractices },
    { count: totalDocuments },
    { count: documentsWithoutText },
    practicePage
  ] = await Promise.all([
    supabase.from("practices").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("documents")
      .select("*", { count: "exact", head: true })
      .or("extracted_text.is.null,extracted_text.eq."),
    listAdminPractices({ pageSize: 5 })
  ]);

  return {
    totalPractices: totalPractices ?? 0,
    totalDocuments: totalDocuments ?? 0,
    documentsWithoutText: documentsWithoutText ?? 0,
    latestPractices: practicePage.items
  };
}

