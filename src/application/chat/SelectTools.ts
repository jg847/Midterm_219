import type { ChatIntent } from "./types";

export function selectTools(intent: ChatIntent): string[] {
  switch (intent) {
    case "affordability":
      return [
        "ui_digest_tool",
        "opportunity_feed_tool",
        "housing_market_tool",
        "dataset_query_tool",
        "location_lookup_tool",
      ];
    case "story_data":
      return ["story_information_tool", "dataset_query_tool", "rag_retrieval_tool", "ui_digest_tool"];
    case "jobs":
      return ["job_digest_tool", "opportunity_feed_tool", "job_search_tool", "location_lookup_tool"];
    case "housing":
      return [
        "housing_digest_tool",
        "opportunity_feed_tool",
        "housing_search_tool",
        "housing_market_tool",
        "location_lookup_tool",
      ];
    case "location":
      return ["location_lookup_tool"];
    default:
      return ["ui_digest_tool", "story_information_tool"];
  }
}
