import { JobSearchInputSchema, type JobSearchInput } from "@/shared/schemas/toolContracts";
import { searchAdzuna } from "@/frameworks/providers/jobs/adzunaClient";
import { searchUsaJobs } from "@/frameworks/providers/jobs/usajobsClient";

import { fail, mapToolError, ok } from "../toolUtils";
import type { ToolDefinition } from "../types";

type JobSearchOutput = {
  listings: Awaited<ReturnType<typeof searchUsaJobs>>;
};

export const jobSearchTool: ToolDefinition<JobSearchInput, JobSearchOutput> = {
  name: "job_search_tool",
  description: "Search jobs from USAJOBS and Adzuna.",
  inputSchema: JobSearchInputSchema,
  async execute(input) {
    try {
      const [usaJobs, adzuna] = await Promise.all([
        searchUsaJobs(input.query, input.location, input.limit, input.jobCategoryCode),
        searchAdzuna(input.query, input.location, input.limit),
      ]);

      const merged = [...usaJobs, ...adzuna].slice(0, input.limit);
      return ok({ listings: merged });
    } catch (error) {
      return fail(mapToolError(error));
    }
  },
};
