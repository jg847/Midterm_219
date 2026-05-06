export type ToolErrorCode =
  | "VALIDATION_ERROR"
  | "UPSTREAM_ERROR"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export type ToolError = {
  code: ToolErrorCode;
  message: string;
  retryable: boolean;
};

export type ToolSuccess<T> = {
  ok: true;
  data: T;
};

export type ToolFailure = {
  ok: false;
  error: ToolError;
};

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;
