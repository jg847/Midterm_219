import { describe, expect, it } from "vitest";

import {
  answerChatQuestionWithNativeToolUse,
  streamChatQuestionWithNativeToolUse,
} from "@/application/chat/AnswerChatQuestionWithNativeToolUse";
import {
  buildAssistantMessageResponse,
  buildBudgetCatalog,
  buildBudgetExecutor,
  buildHousingMarketCatalog,
  buildHousingMarketExecutor,
  buildToolCallResponse,
  DeterministicToolExecutor,
  InMemoryTestConversationRepository,
  RecordingTelemetry,
  ScriptedToolUseModelClient,
  StaticToolCatalog,
} from "@/test/utils/nativeToolUseHarness";
import {
  AMBIGUOUS_STATE_REQUEST,
  buildBudgetStateFixture,
  buildClarificationStateFixture,
  buildConversationRecordFixture,
} from "@/test/utils/nativeToolUseFixtures";

describe("answerChatQuestionWithNativeToolUse", () => {
  it("runs a bounded native tool-use loop and returns a final model-composed answer", async () => {
    const model = new ScriptedToolUseModelClient([
      buildToolCallResponse("tool-1", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
      buildAssistantMessageResponse("Austin has a 1BR HUD baseline of about $1280, based on housing_market_tool."),
    ]);

    const response = await answerChatQuestionWithNativeToolUse(
      { sessionId: "s1", message: "What does a 1BR cost in Austin, TX?" },
      {
        conversationRepository: new InMemoryTestConversationRepository(),
        modelClient: model,
        toolCatalog: buildHousingMarketCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildHousingMarketExecutor(),
      },
    );

    expect(response.answer).toContain("Austin");
    expect(response.toolResults).toHaveLength(1);
    expect(response.toolResults[0]?.toolName).toBe("housing_market_tool");
    expect(response.citations).toContain("tool:housing_market_tool");
  });

  it("asks once for clarification on a first ambiguous state-only request", async () => {
    const repo = new InMemoryTestConversationRepository();

    const response = await answerChatQuestionWithNativeToolUse(
      { sessionId: "s2", message: AMBIGUOUS_STATE_REQUEST },
      {
        conversationRepository: repo,
        modelClient: new ScriptedToolUseModelClient([]),
        toolCatalog: buildHousingMarketCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildHousingMarketExecutor(),
      },
    );

    expect(response.clarificationQuestion).toContain("Texas");
    expect(response.clarificationState?.disclosedFallbackPermitted).toBe(false);
    expect(repo.value?.clarificationState?.state).toBe("TX");
  });

  it("uses disclosed fallback metro on a repeated ambiguous state-only request", async () => {
    const repo = new InMemoryTestConversationRepository(
      buildConversationRecordFixture({
        sessionId: "s3",
        clarificationState: buildClarificationStateFixture(),
      }),
    );
    const model = new ScriptedToolUseModelClient([
      buildAssistantMessageResponse("I used Houston, TX for this pass and here is the housing baseline."),
    ]);

    const response = await answerChatQuestionWithNativeToolUse(
      { sessionId: "s3", message: AMBIGUOUS_STATE_REQUEST },
      {
        conversationRepository: repo,
        modelClient: model,
        toolCatalog: buildHousingMarketCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildHousingMarketExecutor(),
      },
    );

    expect(response.resolvedLocation?.resolutionLabel).toBe("Houston, TX");
    expect(response.resolvedLocation?.usedFallback).toBe(true);
    expect(response.answer).toContain("Location note:");
  });

  it("persists the graceful safety-bound answer and traces when max tool rounds are exceeded", async () => {
    const repo = new InMemoryTestConversationRepository();
    const model = new ScriptedToolUseModelClient([
      buildToolCallResponse("tool-1", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
      buildToolCallResponse("tool-2", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
      buildToolCallResponse("tool-3", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
      buildToolCallResponse("tool-4", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
    ]);

    const response = await answerChatQuestionWithNativeToolUse(
      { sessionId: "s4", message: "Keep checking Austin housing" },
      {
        conversationRepository: repo,
        modelClient: model,
        toolCatalog: buildHousingMarketCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildHousingMarketExecutor(),
      },
    );

    expect(response.answer).toContain("safety limit");
    expect(response.toolResults).toHaveLength(4);
    expect(repo.value?.messages).toHaveLength(2);
    expect(repo.value?.messages[1]?.content).toContain("safety limit");
    expect(repo.value?.messages[1]?.artifacts?.some((artifact) => artifact.type === "tool_result")).toBe(true);
    expect(repo.value?.traces).toHaveLength(4);
  });

  it("emits tool-request and final-answer telemetry for the native tool-use loop", async () => {
    const telemetry = new RecordingTelemetry();
    const model = new ScriptedToolUseModelClient([
      buildToolCallResponse("tool-1", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
      buildAssistantMessageResponse("Austin has a 1BR HUD baseline of about $1280, based on housing_market_tool."),
    ]);

    await answerChatQuestionWithNativeToolUse(
      { sessionId: "s5", message: "What does a 1BR cost in Austin, TX?" },
      {
        conversationRepository: new InMemoryTestConversationRepository(),
        modelClient: model,
        toolCatalog: buildHousingMarketCatalog(),
        telemetry,
        toolExecutor: buildHousingMarketExecutor(),
      },
    );

    expect(telemetry.events.some((event) => event.name === "chat.tool.requested")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.tool.result_received")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.assistant.message_generated")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.final_answer.completed")).toBe(true);
  });

  it("emits Sprint 6 telemetry for resource matches and benchmark fallback selection", async () => {
    const telemetry = new RecordingTelemetry();
    const model = new ScriptedToolUseModelClient([
      buildToolCallResponse("tool-1", "opportunity_feed_tool", {
        query: "entry level",
        location: "Boise, ID",
        city: "Boise",
        state: "ID",
        radiusMiles: 15,
        limit: 5,
      }),
      buildAssistantMessageResponse("I found support links and a benchmark fallback for Boise."),
    ]);

    await answerChatQuestionWithNativeToolUse(
      { sessionId: "s5b", message: "Show jobs, rent, and support for Boise, ID" },
      {
        conversationRepository: new InMemoryTestConversationRepository(),
        modelClient: model,
        toolCatalog: new StaticToolCatalog([
          {
            name: "opportunity_feed_tool",
            description: "Aggregate jobs, housing, and support resources.",
            inputSchema: { type: "object", properties: { location: { type: "string" } } },
          },
        ]),
        telemetry,
        toolExecutor: new DeterministicToolExecutor({
          opportunity_feed_tool: async () => ({
            ok: true,
            data: {
              jobs: { count: 0, listings: [] },
              housing: {
                count: 0,
                listings: [],
                baseline: {
                  fmrMonthly: 1500,
                  hourlyWageNeededFor30Pct: 28.85,
                },
                locationResolution: {
                  resolvedLabel: "National benchmark",
                  resolutionKind: "national_benchmark",
                  usedFallback: true,
                  fallbackReason: "No exact or same-state baseline was available.",
                },
              },
              resources: [
                {
                  label: "Idaho housing programs",
                  url: "https://www.hud.gov/states",
                  category: "housing_support",
                  isFallback: true,
                  fallbackScope: "state",
                },
                {
                  label: "211 support search",
                  url: "https://www.211.org/search?location=Boise%2C%20ID",
                  category: "community_support",
                  isFallback: false,
                },
              ],
              locationResolution: {
                resolvedLabel: "National benchmark",
                resolutionKind: "national_benchmark",
                usedFallback: true,
                fallbackReason: "No exact or same-state baseline was available.",
              },
            },
          }),
        }),
      },
    );

    expect(telemetry.events.some((event) => event.name === "chat.resource_match.exact")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.resource_match.fallback_used")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.benchmark.selected")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.location.unsupported_market_surfaced")).toBe(true);
  });

  it("streams ordered tool-use events before committing the final payload", async () => {
    const model = new ScriptedToolUseModelClient([
      buildToolCallResponse("tool-1", "housing_market_tool", { location: "Austin, TX", bedroomCount: 1 }),
      buildAssistantMessageResponse("Austin has a 1BR HUD baseline of about $1280, based on housing_market_tool."),
    ], ["Austin has ", "a 1BR HUD baseline."]);

    const events: string[] = [];
    let finalPayloadAnswer = "";

    for await (const event of streamChatQuestionWithNativeToolUse(
      { sessionId: "s6", message: "What does a 1BR cost in Austin, TX?" },
      {
        conversationRepository: new InMemoryTestConversationRepository(),
        modelClient: model,
        toolCatalog: buildHousingMarketCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildHousingMarketExecutor(),
      },
    )) {
      events.push(event.type);
      if (event.type === "final_answer_completed") {
        finalPayloadAnswer = event.payload?.answer ?? "";
      }
    }

    expect(events[0]).toBe("stream_started");
    expect(events).toContain("tool_request");
    expect(events).toContain("tool_result");
    expect(events).toContain("assistant_delta");
    expect(events.at(-2)).toBe("final_answer_completed");
    expect(events.at(-1)).toBe("stream_completed");
    expect(finalPayloadAnswer).toContain("Austin");
  });

  it("does not persist a completed assistant turn after aborting the streamed request", async () => {
    const repo = new InMemoryTestConversationRepository();
    const model = new ScriptedToolUseModelClient([
      buildAssistantMessageResponse("Buffered fallback answer"),
    ], ["Streaming ", "answer"]);
    const abortController = new AbortController();

    await expect(async () => {
      for await (const event of streamChatQuestionWithNativeToolUse(
        { sessionId: "s7", message: "Tell me about Austin" },
        {
          conversationRepository: repo,
          modelClient: model,
          toolCatalog: buildHousingMarketCatalog(),
          telemetry: new RecordingTelemetry(),
          toolExecutor: buildHousingMarketExecutor(),
          abortSignal: abortController.signal,
        },
      )) {
        if (event.type === "assistant_delta") {
          abortController.abort();
        }
      }
    }).rejects.toMatchObject({ name: "AbortError" });

    expect(repo.value).toBeNull();
  });

  it("persists merged budget state after a successful budget tool call", async () => {
    const repo = new InMemoryTestConversationRepository(
      buildConversationRecordFixture({
        sessionId: "budget-1",
        budgetState: buildBudgetStateFixture({
          profile: {
            grossMonthlyIncome: 4800,
            monthlyHousingCost: 1800,
          },
        }),
      }),
    );
    const telemetry = new RecordingTelemetry();
    const model = new ScriptedToolUseModelClient([
      buildToolCallResponse("budget-1", "budget_plan_tool", {
        profile: {
          grossMonthlyIncome: 5000,
          monthlyHousingCost: 1800,
          utilities: 150,
        },
        location: {
          formatted: "Austin, TX",
          city: "Austin",
          state: "TX",
          country: "US",
          radiusMiles: 15,
        },
        compareAgainst: {
          rentMonthly: 1900,
          source: "tool_observed",
        },
      }),
      buildAssistantMessageResponse("This budget looks tight but workable in Austin."),
    ]);

    const response = await answerChatQuestionWithNativeToolUse(
      { sessionId: "budget-1", message: "Can you build me a budget for Austin?" },
      {
        conversationRepository: repo,
        modelClient: model,
        toolCatalog: buildBudgetCatalog(),
        telemetry,
        toolExecutor: buildBudgetExecutor(),
      },
    );

    expect(response.toolResults[0]?.toolName).toBe("budget_plan_tool");
    expect(repo.value?.budgetState?.profile.grossMonthlyIncome).toBe(5000);
    expect(repo.value?.budgetState?.profile.monthlyHousingCost).toBe(1800);
    expect(repo.value?.budgetState?.analysisReady).toBe(false);
    expect(repo.value?.budgetState?.missingFields).toContain("netMonthlyIncome");
    expect(telemetry.events.some((event) => event.name === "chat.budget_state.updated")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.budget_fact.corrected")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.budget_fact.updated")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.budget_comparison_target.adopted")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.budget.tool_executed")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.budget.degraded_fallback_used")).toBe(true);
    expect(telemetry.events.some((event) => event.name === "chat.budget.verdict_generated")).toBe(true);
  });

  it("includes persisted budget state in the next native-tool-use model prompt", async () => {
    const model = new ScriptedToolUseModelClient([
      buildAssistantMessageResponse("I can continue from your saved budget facts."),
    ]);

    await answerChatQuestionWithNativeToolUse(
      { sessionId: "budget-2", message: "What should I add next?" },
      {
        conversationRepository: new InMemoryTestConversationRepository(
          buildConversationRecordFixture({
            sessionId: "budget-2",
            budgetState: buildBudgetStateFixture(),
          }),
        ),
        modelClient: model,
        toolCatalog: buildBudgetCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildBudgetExecutor(),
      },
    );

    const lastUserMessage = model.calls[0]?.messages.at(-1);
    const promptText = lastUserMessage?.content[0]?.type === "text" ? lastUserMessage.content[0].text : "";

    expect(promptText).toContain("Persisted budget state");
    expect(promptText).toContain("grossMonthlyIncome");
  });

  it("drops budget prompt instructions and persisted budget context when the budget tool is unavailable", async () => {
    const model = new ScriptedToolUseModelClient([
      buildAssistantMessageResponse("Structured budgeting is temporarily unavailable."),
    ]);

    await answerChatQuestionWithNativeToolUse(
      { sessionId: "budget-disabled", message: "Can you budget this move?" },
      {
        conversationRepository: new InMemoryTestConversationRepository(
          buildConversationRecordFixture({
            sessionId: "budget-disabled",
            budgetState: buildBudgetStateFixture(),
          }),
        ),
        modelClient: model,
        toolCatalog: buildHousingMarketCatalog(),
        telemetry: new RecordingTelemetry(),
        toolExecutor: buildHousingMarketExecutor(),
      },
    );

    const prompt = model.calls[0];
    const lastUserMessage = prompt?.messages.at(-1);
    const promptText = lastUserMessage?.content[0]?.type === "text" ? lastUserMessage.content[0].text : "";

    expect(prompt?.system).toContain("budgeting capability is currently disabled");
    expect(prompt?.system).not.toContain("use budget_plan_tool for structured affordability analysis");
    expect(promptText).not.toContain("Persisted budget state");
  });
});