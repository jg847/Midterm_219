import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

import Home from "@/app/page";
import ResourcesPage from "@/app/resources/page";
import StoryPage from "@/app/story/page";
import { AppNav } from "@/components/AppNav";

describe("homepage shell", () => {
  it("renders the chat-first Grounded Moves shell with compact home hero chat and location controls", () => {
    const markup = renderToStaticMarkup(React.createElement(Home));

    expect(markup).toContain("Grounded Moves");
    expect(markup).toContain("Location-aware housing, jobs, and affordability guidance");
    expect(markup).toContain("Use Current Location (optional)");
    expect(markup).toContain("City, state or ZIP code");
    expect(markup).toContain("Phoenix");
    expect(markup).not.toContain("Grounded Moves Assistant");
    expect(markup).not.toContain("Supporting destinations");
    expect(markup).not.toContain("Assistant Chat");
    expect(markup).not.toContain("Find entry-level jobs near Newark");
  });

  it("keeps Story and Resources in primary navigation with the new product identity", () => {
    const markup = renderToStaticMarkup(React.createElement(AppNav));

    expect(markup).toContain("Grounded Moves");
    expect(markup).toContain("/story");
    expect(markup).toContain("/resources");
  });

  it("preserves the supporting Story and Resources routes", () => {
    const storyMarkup = renderToStaticMarkup(React.createElement(StoryPage));
    const resourcesMarkup = renderToStaticMarkup(React.createElement(ResourcesPage));

    expect(storyMarkup).toContain("Story Explorer");
    expect(resourcesMarkup).toContain("Resources");
  });
});