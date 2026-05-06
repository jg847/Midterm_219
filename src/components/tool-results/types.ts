import type { ReactElement } from "react";

import type { ChatToolResult } from "@/interface-adapters/chat/types";

export type ToolResultPresenter<TViewModel> = {
  toolName: string;
  present(result: ChatToolResult): TViewModel | null;
  render(viewModel: TViewModel): ReactElement;
};