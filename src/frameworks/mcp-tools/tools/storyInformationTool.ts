import { LocalStoryRepository } from "@/frameworks/repositories/LocalStoryRepository";
import { StoryInformationInputSchema, type StoryInformationInput } from "@/shared/schemas/toolContracts";

import { fail, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";

type StoryInformationOutput = {
  answer: string;
  citations: Array<{ title: string; source: string }>;
};

const repository = new LocalStoryRepository();

export const storyInformationTool: ToolDefinition<StoryInformationInput, StoryInformationOutput> = {
  name: "story_information_tool",
  description: "Return concise story/document context with citations.",
  inputSchema: StoryInformationInputSchema,
  async execute(input) {
    const docs = await repository.listDocuments();
    if (!docs.length) {
      return fail({
        code: "NOT_FOUND",
        message: "No story documents available",
        retryable: false,
      });
    }

    const answer = `Story context for '${input.question}': ${docs.map((doc) => doc.content).join(" ")}`;

    return ok({
      answer,
      citations: docs.map((doc) => ({ title: doc.title, source: doc.source })),
    });
  },
};
