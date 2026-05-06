import {
  ListingActionLinksInputSchema,
  type ListingActionLinksInput,
} from "@/shared/schemas/toolContracts";

import { ok } from "../toolUtils";
import type { ToolDefinition } from "../types";

type ActionLink = {
  label: string;
  url: string;
};

type ListingActionLinksOutput = {
  primaryUrl: string;
  primaryLabel: string;
  alternates: ActionLink[];
};

function encodeQuery(parts: string[]): string {
  return encodeURIComponent(parts.filter(Boolean).join(", "));
}

export const listingActionLinksTool: ToolDefinition<
  ListingActionLinksInput,
  ListingActionLinksOutput
> = {
  name: "listing_action_links_tool",
  description: "Generate clean external action links for a housing listing.",
  inputSchema: ListingActionLinksInputSchema,
  async execute(input) {
    const query = encodeQuery([input.formattedAddress, input.city, input.state]);
    const zillowUrl = `https://www.zillow.com/homes/${query}_rb/`;
    const apartmentsUrl = `https://www.apartments.com/search/?q=${query}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

    return ok({
      primaryUrl: zillowUrl,
      primaryLabel: "View on Zillow",
      alternates: [
        { label: "Apartments.com", url: apartmentsUrl },
        { label: "Google Maps", url: mapsUrl },
      ],
    });
  },
};
