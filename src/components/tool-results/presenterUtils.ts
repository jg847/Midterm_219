import type { ChatToolResult } from "@/interface-adapters/chat/types";

export function tryAsObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

export function getToolResultDataObject(result: ChatToolResult): Record<string, unknown> | null {
  const payload = tryAsObject(result.payload);
  return tryAsObject(payload?.data);
}

export function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}