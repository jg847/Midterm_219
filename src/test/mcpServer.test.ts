import { describe, expect, it } from "vitest";

import { createMcpServer } from "@/frameworks/mcp-tools";

describe("MCP server", () => {
  it("lists registered tools", () => {
    const server = createMcpServer();
    const tools = server.listTools();

    expect(tools).toContain("location_lookup_tool");
    expect(tools).toContain("job_search_tool");
    expect(tools).toContain("job_digest_tool");
    expect(tools).toContain("opportunity_feed_tool");
    expect(tools).toContain("ui_digest_tool");
    expect(tools).toContain("listing_action_links_tool");
    expect(tools).toContain("housing_digest_tool");
  });

  it("returns validation error for invalid input", async () => {
    const server = createMcpServer();
    const result = (await server.callTool("dataset_query_tool", { metric: "bad" })) as {
      ok: boolean;
      error?: { code: string };
    };

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("VALIDATION_ERROR");
  });
});
