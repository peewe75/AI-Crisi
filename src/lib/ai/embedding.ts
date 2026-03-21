import "server-only";

import { google } from "@ai-sdk/google";
import { embed } from "ai";

export const KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS = 768;
export const KNOWLEDGE_BASE_EMBEDDING_MODEL = "gemini-embedding-001";

type EmbeddingTaskType =
  | "SEMANTIC_SIMILARITY"
  | "CLASSIFICATION"
  | "CLUSTERING"
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY"
  | "QUESTION_ANSWERING"
  | "FACT_VERIFICATION"
  | "CODE_RETRIEVAL_QUERY";

export async function createKnowledgeBaseEmbedding(params: {
  value: string;
  taskType: EmbeddingTaskType;
}) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "Variabile d'ambiente mancante: GOOGLE_GENERATIVE_AI_API_KEY"
    );
  }

  const normalizedValue = params.value.trim();

  if (!normalizedValue) {
    throw new Error("Impossibile creare embedding da una stringa vuota.");
  }

  const { embedding } = await embed({
    model: google.embedding(KNOWLEDGE_BASE_EMBEDDING_MODEL),
    value: normalizedValue,
    providerOptions: {
      google: {
        outputDimensionality: KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS,
        taskType: params.taskType,
      },
    },
  });

  if (
    !Array.isArray(embedding) ||
    embedding.length !== KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Embedding Gemini non valido: attese ${KNOWLEDGE_BASE_EMBEDDING_DIMENSIONS} dimensioni, ottenute ${embedding.length}.`
    );
  }

  return embedding;
}
