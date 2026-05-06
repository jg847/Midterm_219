import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

import { budgetPlanToolResultPresenter } from "./renderers/BudgetPlanToolResult";
import { datasetQueryToolResultPresenter } from "./renderers/DatasetQueryToolResult";
import { housingDigestToolResultPresenter } from "./renderers/HousingDigestToolResult";
import { housingSearchToolResultPresenter } from "./renderers/HousingSearchToolResult";
import { jobDigestToolResultPresenter } from "./renderers/JobDigestToolResult";
import { jobSearchToolResultPresenter } from "./renderers/JobSearchToolResult";
import { opportunityFeedToolResultPresenter } from "./renderers/OpportunityFeedToolResult";
import { ragRetrievalToolResultPresenter } from "./renderers/RagRetrievalToolResult";
import { uiDigestToolResultPresenter } from "./renderers/UiDigestToolResult";
import type { ToolResultPresenter } from "./types";

const presenters: ToolResultPresenter<unknown>[] = [
  datasetQueryToolResultPresenter,
  uiDigestToolResultPresenter,
  jobSearchToolResultPresenter,
  housingSearchToolResultPresenter,
  jobDigestToolResultPresenter,
  housingDigestToolResultPresenter,
  ragRetrievalToolResultPresenter,
  opportunityFeedToolResultPresenter,
  budgetPlanToolResultPresenter,
];

export function renderTypedToolResult(result: ChatToolResult): ReactElement | null {
  const presenter = presenters.find((entry) => entry.toolName === result.toolName);
  if (!presenter) {
    return null;
  }

  const viewModel = presenter.present(result);
  if (!viewModel) {
    return null;
  }

  return presenter.render(viewModel);
}