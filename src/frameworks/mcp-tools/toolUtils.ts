import type { ToolError, ToolResult } from "@/domain/models/ToolTypes";

export function mapToolError(error: unknown): ToolError {
  if (error instanceof Error && error.message === "RATE_LIMITED") {
    return {
      code: "RATE_LIMITED",
      message: "Tool rate limit reached. Please retry shortly.",
      retryable: true,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UPSTREAM_ERROR",
      message: error.message,
      retryable: true,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected tool error",
    retryable: false,
  };
}

export function ok<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function fail<T>(error: ToolError): ToolResult<T> {
  return { ok: false, error };
}
