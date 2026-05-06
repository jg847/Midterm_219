import type { ChatIntent } from "./types";

export function classifyIntent(message: string): ChatIntent {
  const text = message.toLowerCase();

  if (/(dataset|story|claim|research|source|wage|rent trend)/.test(text)) {
    return "story_data";
  }

  if (/(compare|comparison|afford|affordability|rent burden|cost burden|pay vs rent|salary vs rent|wage vs rent|budget fit|realistic)/.test(text)) {
    return "affordability";
  }

  if (/(job|career|hiring|salary|position)/.test(text)) {
    return "jobs";
  }

  if (/(rent|rental|apartment|housing|lease)/.test(text)) {
    return "housing";
  }

  if (/(near me|location|city|state|where)/.test(text)) {
    return "location";
  }

  return "general";
}
