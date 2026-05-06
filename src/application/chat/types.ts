import { z } from "zod";

import type {
  ClarificationState,
  LocationResolution,
  ResolvedLocationContext,
} from "@/domain/models/LocationContext";

export const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  stream: z.boolean().optional(),
  location: z
    .object({
      formatted: z.string().min(2),
      city: z.string().min(2),
      state: z.string().min(2),
      country: z.string().min(2).default("US"),
      postalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/).optional(),
      radiusMiles: z.number().int().min(1).max(100).default(15),
    })
    .optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export type ChatIntent =
  | "story_data"
  | "affordability"
  | "jobs"
  | "housing"
  | "location"
  | "general";

export type ToolExecutionResult = {
  toolName: string;
  ok: boolean;
  latencyMs: number;
  payload: unknown;
  errorCode?: string;
  locationResolution?: LocationResolution;
};

export type ChatResponsePayload = {
  sessionId: string;
  answer: string;
  intent: ChatIntent;
  toolResults: ToolExecutionResult[];
  citations: string[];
  resolvedLocation?: ResolvedLocationContext;
  clarificationState?: ClarificationState;
  clarificationQuestion?: string;
};
