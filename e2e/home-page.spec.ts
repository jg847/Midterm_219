import { expect, test, type Locator, type Page } from "@playwright/test";

async function tabTo(page: Page, locator: Locator, maxTabs: number = 40) {
  for (let count = 0; count < maxTabs; count += 1) {
    await page.keyboard.press("Tab");
    const isFocused = await locator.evaluate((element: Element) => element === element.ownerDocument.activeElement);
    if (isFocused) {
      return;
    }
  }

  throw new Error("Target control was not reached through keyboard navigation.");
}

test("homepage is chat-first and /chat redirects to it", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Location-aware housing, jobs, and affordability guidance/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Send/i })).toBeVisible();
  await expect(page.getByLabel(/Manual location query/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Explore market comparison scenarios/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review support pathways/i })).toBeVisible();

  await page.goto("/chat");
  await page.waitForURL("/");
  await expect(page).toHaveURL(/\/$/);
});

test("homepage chat and location fallback flows work in mock mode", async ({ browser }) => {
  const context = await browser.newContext({ permissions: [] });
  const page = await context.newPage();

  await page.goto("/");

  await page.getByRole("button", { name: /Use Current Location/i }).click();
  await expect(page.getByText(/Location permission denied\. You can enter a city manually\./i)).toBeVisible();

  await page.route("**/api/location/resolve", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        location: {
          formatted: "Austin, TX",
          city: "Austin",
          state: "TX",
          country: "US",
          lat: 30.2672,
          lng: -97.7431,
          radiusMiles: 15,
        },
        baseline: {
          fmrMonthly: 1280,
          hourlyWageNeededFor30Pct: 24.62,
        },
        policy: {
          minimumWageHourly: 7.25,
          burdenThresholdPct: 30,
          notes: "Federal minimum wage baseline.",
        },
      }),
    });
  });

  await page.getByLabel(/Manual location query/i).fill("Austin, TX");
  await page.getByRole("button", { name: /^Apply$/i }).click();
  await expect(page.getByText(/Active location: Austin, TX/i)).toBeVisible();

  const chatResponsePromise = page.waitForResponse("**/api/chat");
  await page.getByLabel(/Chat message/i).fill("Can I afford a move?");
  await page.getByRole("button", { name: /^Send$/i }).click();
  expect((await chatResponsePromise).ok()).toBe(true);
  await expect(page.getByText(/This is a deterministic budget mock response for Austin, TX\./i)).toBeVisible();
  await expect(page.getByText(/housing taking 36% of income\./i)).toBeVisible();

  await context.close();
});

test("homepage restores session transcript on reload, isolates browser contexts, and supports reset", async ({ browser }) => {
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();

  await firstPage.goto("/");
  await expect(firstPage.getByLabel(/Chat message/i)).toBeEnabled();
  await expect(firstPage.getByRole("button", { name: /^Send$/i })).toBeEnabled();
  await firstPage.getByLabel(/Chat message/i).fill("Can I afford a move if rent is $1800?");
  await firstPage.getByRole("button", { name: /^Send$/i }).click();
  await expect(firstPage.getByText(/This is a deterministic budget mock response for Austin, TX\./i)).toBeVisible();

  await firstPage.waitForFunction(
    () => window.localStorage.getItem("grounded-moves-session-id") !== null,
  );
  const firstSessionId = await firstPage.evaluate(() => window.localStorage.getItem("grounded-moves-session-id"));

  await firstPage.reload();
  await expect(firstPage.getByText(/Recent conversation restored\./i)).toBeVisible();
  await expect(firstPage.getByText(/Can I afford a move if rent is \$1800\?/i)).toBeVisible();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/");
  await secondPage.waitForFunction(
    () => window.localStorage.getItem("grounded-moves-session-id") !== null,
  );
  const secondSessionId = await secondPage.evaluate(() => window.localStorage.getItem("grounded-moves-session-id"));

  expect(firstSessionId).not.toBeNull();
  expect(secondSessionId).not.toBeNull();
  expect(secondSessionId).not.toBe(firstSessionId);

  await firstPage.getByRole("button", { name: /Reset chat/i }).click();
  await expect(firstPage.getByText(/Conversation reset\./i)).toBeVisible();
  await expect(firstPage.getByText(/This is a mock response from the Sprint 4 chat client\./i)).toHaveCount(0);

  await firstContext.close();
  await secondContext.close();
});

test("homepage reuses the same session across tabs in one browser context", async ({ browser }) => {
  const context = await browser.newContext();
  const firstPage = await context.newPage();

  await firstPage.goto("/");
  await firstPage.getByLabel(/Chat message/i).fill("Keep this conversation in one browser session");
  await firstPage.getByRole("button", { name: /^Send$/i }).click();
  await expect(firstPage.getByText(/This is a mock response from the Sprint 4 chat client\./i).last()).toBeVisible();

  await firstPage.waitForFunction(
    () => window.localStorage.getItem("grounded-moves-session-id") !== null,
  );
  const firstSessionId = await firstPage.evaluate(() => window.localStorage.getItem("grounded-moves-session-id"));

  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await expect(secondPage.getByText(/Recent conversation restored\./i)).toBeVisible();
  await expect(secondPage.getByText(/Keep this conversation in one browser session/i)).toBeVisible();

  const secondSessionId = await secondPage.evaluate(() => window.localStorage.getItem("grounded-moves-session-id"));
  expect(secondSessionId).toBe(firstSessionId);

  await secondPage.getByLabel(/Chat message/i).fill("Continue this from another tab");
  await secondPage.getByRole("button", { name: /^Send$/i }).click();
  await expect(secondPage.getByText(/This is a mock response from the Sprint 4 chat client\./i).last()).toBeVisible();

  await firstPage.reload();
  await expect(firstPage.getByText(/Continue this from another tab/i)).toBeVisible();

  await context.close();
});

test("homepage supports keyboard-only navigation to location, composer, and send controls", async ({ page }) => {
  await page.goto("/");

  const manualLocationInput = page.getByLabel(/Manual location query/i);
  const chatInput = page.getByLabel(/Chat message/i);
  const sendButton = page.getByRole("button", { name: /^Send$/i });

  await expect(chatInput).toBeEnabled();
  await expect(sendButton).toBeEnabled();

  await tabTo(page, manualLocationInput);
  await expect(manualLocationInput).toBeFocused();

  await page.goto("/");
  await expect(chatInput).toBeEnabled();
  await tabTo(page, chatInput);
  await expect(chatInput).toBeFocused();

  await page.goto("/");
  await expect(sendButton).toBeEnabled();
  await tabTo(page, sendButton);
  await expect(sendButton).toBeFocused();
});

test("homepage current-location success path updates the active location", async ({ browser }) => {
  const context = await browser.newContext({
    geolocation: { latitude: 47.6062, longitude: -122.3321 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();

  await page.route("**/api/location/resolve", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        location: {
          formatted: "Seattle, WA",
          city: "Seattle",
          state: "WA",
          country: "US",
          lat: 47.6062,
          lng: -122.3321,
          radiusMiles: 15,
        },
        baseline: {
          fmrMonthly: 1895,
          hourlyWageNeededFor30Pct: 36.44,
        },
        policy: {
          minimumWageHourly: 16.28,
          burdenThresholdPct: 30,
          notes: "Washington minimum wage baseline.",
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Use Current Location/i }).click();

  await expect(page.getByText(/Active location: Seattle, WA/i)).toBeVisible();

  await context.close();
});

test("homepage keeps the location anchor and composer in the initial mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByLabel(/Manual location query/i)).toBeInViewport();
  await expect(page.getByLabel(/Chat message/i)).toBeInViewport();
  await expect(page.getByRole("button", { name: /^Send$/i })).toBeInViewport();
});