import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("new visitor can start, answer, see results and continue", async ({ page }) => {
  await page.reload();
  await expect(page.getByRole("heading", { name: /How good a driver/ })).toBeVisible();
  await page.getByRole("button", { name: "Try this question" }).click();
  const firstQuestion = await page.getByRole("heading", { level: 1 }).textContent();
  await page.getByRole("group", { name: "Choose one answer" }).getByRole("button").first().click();
  await expect(page.getByText(/drivers answered/)).toBeVisible();
  await expect(page.getByText(/XP total/)).toBeVisible();
  await page.getByRole("button", { name: /Next challenge/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(firstQuestion ?? "");
});

test("question preview controls the first challenge", async ({ page }) => {
  await page.reload();
  const preview = page.getByRole("button", { name: /Preview question: Heavy rain starts/ }).first();
  await preview.click();
  await expect(page.getByRole("heading", { level: 2, name: /Heavy rain starts/ })).toBeVisible();
  await page.getByRole("button", { name: "Try this question" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Heavy rain starts/ })).toBeVisible();
});

test("community challenge shows a community result", async ({ page }) => {
  await page.goto("/c/supermarket-line");
  await page.getByRole("group", { name: "Choose one answer" }).getByRole("button").first().click();
  await expect(page.getByText(/agree with you|against the majority/)).toBeVisible();
  await expect(page.getByText("Correct", { exact: true })).toHaveCount(0);
});

test("Daily completes five challenges and awards the bonus", async ({ page }) => {
  await page.goto("/daily");
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("group", { name: "Choose one answer" }).getByRole("button").first().click();
    await expect(page.getByText(/drivers answered/)).toBeVisible();
    await page.getByRole("button", { name: index === 4 ? "Finish Daily" : "Next challenge" }).click();
  }
  await expect(page.getByText("Daily complete")).toBeVisible();
  await expect(page.getByText(/\+50 XP/)).toBeVisible();
});

test("direct challenge progress survives refresh", async ({ page }) => {
  await page.goto("/c/motorway-rain-gap");
  await page.getByRole("button", { name: /Increase your following gap/ }).click();
  await expect(page.getByText("Correct", { exact: true })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByText("Answered").locator(".." ).getByText("1", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Answered").locator(".." ).getByText("1", { exact: true })).toBeVisible();
});

test("keyboard controls answer and continue", async ({ page }) => {
  await page.reload();
  await page.getByRole("button", { name: "Try this question" }).click();
  const firstQuestion = await page.getByRole("heading", { level: 1 }).textContent();
  await page.keyboard.press("1");
  await expect(page.getByRole("region", { name: "Challenge result" })).toBeVisible();
  await page.keyboard.press("n");
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(firstQuestion ?? "");
});

test("sharing falls back to copying the direct link", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
  await page.goto("/c/motorway-rain-gap");
  await page.getByRole("button", { name: /Increase your following gap/ }).click();
  await page.getByRole("button", { name: "Share challenge" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
});

test("failed challenge imagery shows the designed fallback", async ({ page }) => {
  await page.route("**/_next/image?**", (route) => route.abort());
  await page.goto("/c/motorway-rain-gap");
  await expect(page.getByText("Image unavailable")).toBeVisible();
});

test("uncached navigation uses the offline fallback", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.goto("/not-cached-offline");
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  await context.setOffline(false);
});

test("compact phone widths do not overflow horizontally", async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Try this question" })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  }
});

test("core and result screens have no serious accessibility violations", async ({ page }) => {
  await page.reload();
  const onboardingResults = await new AxeBuilder({ page }).analyze();
  expect(onboardingResults.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  await page.getByRole("button", { name: "Try this question" }).click();
  const challengeResults = await new AxeBuilder({ page }).analyze();
  expect(challengeResults.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  await page.getByRole("group", { name: "Choose one answer" }).getByRole("button").first().click();
  const answerResults = await new AxeBuilder({ page }).analyze();
  expect(answerResults.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
});
