import type { StoryDocument, StoryRepository } from "@/application/ports/StoryRepository";

const DOCUMENTS: StoryDocument[] = [
  {
    id: "legacy-readme",
    title: "Legacy Story README",
    source: "references/newark-affordability-app/README.md",
    content:
      "The legacy project asks what wage students need to avoid housing burden and frames burden using the 30% affordability threshold.",
  },
  {
    id: "legacy-presentation",
    title: "Legacy STAR Presentation",
    source: "references/newark-affordability-app/PRESENTATION.md",
    content:
      "The presentation emphasizes interactive storytelling, slider-based burden simulation, and roommate counterfactual analysis.",
  },
];

export class LocalStoryRepository implements StoryRepository {
  async listDocuments(): Promise<StoryDocument[]> {
    return DOCUMENTS;
  }

  async getDocumentById(id: string): Promise<StoryDocument | null> {
    return DOCUMENTS.find((doc) => doc.id === id) ?? null;
  }
}
