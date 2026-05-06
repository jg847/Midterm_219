import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import ChatPage from "@/app/chat/page";

describe("/chat route", () => {
  beforeEach(() => {
    redirectMock.mockReset();
  });

  it("redirects to the homepage", () => {
    ChatPage();

    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});