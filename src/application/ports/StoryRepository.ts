export type StoryDocument = {
  id: string;
  title: string;
  content: string;
  source: string;
};

export interface StoryRepository {
  listDocuments(): Promise<StoryDocument[]>;
  getDocumentById(id: string): Promise<StoryDocument | null>;
}
