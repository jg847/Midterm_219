const bannedPatterns = [/(?:kill|bomb|attack)\s/i];
const promptInjectionPatterns = [
  /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
  /reveal\s+(?:the\s+)?system\s+prompt/i,
  /developer\s+message/i,
];

export type ModerationStageName =
  | "normalize_input"
  | "input_validation"
  | "prompt_injection_heuristics"
  | "safety_terms";

type ModerationState = {
  message: string;
};

type ModerationPassOutcome = {
  kind: "pass";
  stage: ModerationStageName;
};

type ModerationTransformOutcome = {
  kind: "transform";
  stage: ModerationStageName;
  message: string;
};

type ModerationBlockOutcome = {
  kind: "block";
  stage: ModerationStageName;
  reason: string;
};

export type ModerationStageOutcome =
  | ModerationPassOutcome
  | ModerationTransformOutcome
  | ModerationBlockOutcome;

type ModerationStage = (state: ModerationState) => ModerationStageOutcome;

export type MessageModerationResult =
  | {
      ok: true;
      message: string;
      outcomes: Array<ModerationPassOutcome | ModerationTransformOutcome>;
    }
  | {
      ok: false;
      reason: string;
      stage: ModerationStageName;
      message: string;
      outcomes: Array<ModerationPassOutcome | ModerationTransformOutcome>;
    };

function normalizeInputStage(state: ModerationState): ModerationStageOutcome {
  const normalizedMessage = state.message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  if (normalizedMessage === state.message) {
    return { kind: "pass", stage: "normalize_input" };
  }

  return {
    kind: "transform",
    stage: "normalize_input",
    message: normalizedMessage,
  };
}

function minimumLengthStage(state: ModerationState): ModerationStageOutcome {
  if (state.message.trim().length < 2) {
    return {
      kind: "block",
      stage: "input_validation",
      reason: "Message is too short.",
    };
  }

  return { kind: "pass", stage: "input_validation" };
}

function promptInjectionHeuristicsStage(state: ModerationState): ModerationStageOutcome {
  for (const pattern of promptInjectionPatterns) {
    if (pattern.test(state.message)) {
      return {
        kind: "block",
        stage: "prompt_injection_heuristics",
        reason: "Message violates safety policy.",
      };
    }
  }

  return { kind: "pass", stage: "prompt_injection_heuristics" };
}

function safetyTermsStage(state: ModerationState): ModerationStageOutcome {
  for (const pattern of bannedPatterns) {
    if (pattern.test(state.message)) {
      return {
        kind: "block",
        stage: "safety_terms",
        reason: "Message violates safety policy.",
      };
    }
  }

  return { kind: "pass", stage: "safety_terms" };
}

const defaultModerationStages: ModerationStage[] = [
  normalizeInputStage,
  minimumLengthStage,
  promptInjectionHeuristicsStage,
  safetyTermsStage,
];

export function moderateUserMessage(message: string): MessageModerationResult {
  const state: ModerationState = { message };
  const outcomes: Array<ModerationPassOutcome | ModerationTransformOutcome> = [];

  for (const stage of defaultModerationStages) {
    const outcome = stage(state);

    if (outcome.kind === "block") {
      return {
        ok: false,
        reason: outcome.reason,
        stage: outcome.stage,
        message: state.message,
        outcomes,
      };
    }

    if (outcome.kind === "transform") {
      state.message = outcome.message;
    }

    outcomes.push(outcome);
  }

  return {
    ok: true,
    message: state.message,
    outcomes,
  };
}

export function ensureMessageAllowed(message: string): { ok: true; message: string } | { ok: false; reason: string } {
  const result = moderateUserMessage(message);

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  return { ok: true, message: result.message };
}
