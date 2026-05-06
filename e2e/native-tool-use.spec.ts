import { expect, test } from "@playwright/test";
import {
  AMBIGUOUS_STATE_REQUEST,
  CLARIFICATION_QUESTION,
  DISCLOSED_FALLBACK_LOCATION_NOTE,
  DISCLOSED_FALLBACK_METRO,
} from "../src/test/utils/nativeToolUseFixtures";

test("homepage asks once for ambiguous state input and then uses disclosed fallback after reload", async ({ page }) => {
  test.setTimeout(45000);

  await page.goto("/");

  const firstChatResponse = page.waitForResponse("**/api/chat");
  await page.getByLabel(/Chat message/i).fill(AMBIGUOUS_STATE_REQUEST);
  await page.getByRole("button", { name: /^Send$/i }).click();
  expect((await firstChatResponse).ok()).toBe(true);

  await expect(page.getByText(CLARIFICATION_QUESTION)).toBeVisible();
  await expect(page.getByText(DISCLOSED_FALLBACK_METRO)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Recent conversation restored\./i)).toBeVisible();
  await expect(page.getByText(CLARIFICATION_QUESTION)).toBeVisible();

  const secondChatResponse = page.waitForResponse("**/api/chat");
  await page.getByLabel(/Chat message/i).fill(AMBIGUOUS_STATE_REQUEST);
  await page.getByRole("button", { name: /^Send$/i }).click();
  expect((await secondChatResponse).ok()).toBe(true);

  await expect(page.getByText(/Location note:/i)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(DISCLOSED_FALLBACK_LOCATION_NOTE)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Recommended Results/i)).toBeVisible({ timeout: 15000 });
});