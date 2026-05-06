export type RetrievalChunk = {
  id: string;
  documentId: string;
  content: string;
  score: number;
};

export type RetrievalMode = "local_seed_fallback" | "external_production";

export type RetrievalSearchResult = {
  mode: RetrievalMode;
  disclosure: string;
  chunks: RetrievalChunk[];
};

export interface RetrievalRepository {
  search(query: string, limit: number): Promise<RetrievalSearchResult>;
}
