import "server-only";

import { createKnowledgeBaseEmbedding } from "@/lib/ai/embedding";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type KnowledgeBaseMatch = {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "Nessun metadato aggiuntivo.";
  }

  return Object.entries(metadata)
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join("\n");
}

export async function searchSovraindebitamentoKnowledgeBase(
  query: string,
  matchCount = 5,
  procedureType?: string
): Promise<{
  aggregatedContext: string;
  matches: KnowledgeBaseMatch[];
}> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { aggregatedContext: "", matches: [] };
  }

  const embedding = await createKnowledgeBaseEmbedding({
    value: normalizedQuery,
    taskType: "RETRIEVAL_QUERY",
  });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "match_knowledge_base_sovraindebitamento",
    {
      query_embedding: embedding,
      match_count: matchCount,
      filter_procedure: procedureType ?? null,
    }
  );

  if (error) {
    throw new Error(
      `Vector search sovraindebitamento fallita: ${error.message}`
    );
  }

  const matches = ((data as KnowledgeBaseMatch[] | null) ?? []).filter(
    (item) => typeof item?.content === "string" && item.content.trim().length > 0
  );

  const aggregatedContext = matches
    .map((match, index) => {
      return [
        `Fonte ${index + 1}: ${match.title}`,
        `Categoria: ${match.category}`,
        `Similarita: ${match.similarity.toFixed(4)}`,
        "Metadati:",
        formatMetadata(match.metadata),
        "Contenuto:",
        match.content.trim(),
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return {
    aggregatedContext,
    matches,
  };
}

export async function searchKnowledgeBase(
  query: string,
  matchCount = 5
): Promise<{
  aggregatedContext: string;
  matches: KnowledgeBaseMatch[];
}> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return { aggregatedContext: "", matches: [] };
  }

  const embedding = await createKnowledgeBaseEmbedding({
    value: normalizedQuery,
    taskType: "RETRIEVAL_QUERY",
  });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("match_knowledge_base", {
    query_embedding: embedding,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Vector search fallita: ${error.message}`);
  }

  const matches = ((data as KnowledgeBaseMatch[] | null) ?? []).filter(
    (item) => typeof item?.content === "string" && item.content.trim().length > 0
  );

  const aggregatedContext = matches
    .map((match, index) => {
      return [
        `Fonte ${index + 1}: ${match.title}`,
        `Categoria: ${match.category}`,
        `Similarita: ${match.similarity.toFixed(4)}`,
        "Metadati:",
        formatMetadata(match.metadata),
        "Contenuto:",
        match.content.trim(),
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return {
    aggregatedContext,
    matches,
  };
}

