import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Chunk = {
  id: string;
  documentId: string;
  content: string;
  score: number;
};

function chunkText(documentId: string, content: string): Chunk[] {
  const parts = content
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20);

  return parts.map((part, index) => ({
    id: `${documentId}-${index + 1}`,
    documentId,
    content: part,
    score: 0.5,
  }));
}

async function main() {
  const root = process.cwd();
  const readmePath = path.join(root, "..", "references", "newark-affordability-app", "README.md");
  const presentationPath = path.join(
    root,
    "..",
    "references",
    "newark-affordability-app",
    "PRESENTATION.md",
  );

  const [readme, presentation] = await Promise.all([
    readFile(readmePath, "utf8"),
    readFile(presentationPath, "utf8"),
  ]);

  const chunks = [...chunkText("legacy-readme", readme), ...chunkText("legacy-presentation", presentation)];
  const outputPath = path.join(root, "data", "seeds", "story-chunks.seed.json");

  await writeFile(outputPath, JSON.stringify(chunks, null, 2), "utf8");
  console.log(`Wrote ${chunks.length} retrieval chunks to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
