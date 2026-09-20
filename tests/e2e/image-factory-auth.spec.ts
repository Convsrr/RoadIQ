import { expect, test } from "@playwright/test";

const operatorToken = process.env.ROADIQ_IMAGE_FACTORY_TEST_TOKEN;
const useDashboardFixture = process.env.ROADIQ_IMAGE_FACTORY_TEST_MODE === "fixture";

const dashboardFixture = {
  metrics: {
    totalChallenges: 1,
    missing: 0,
    legacy: 1,
    generating: 0,
    pendingQa: 0,
    qaPass: 0,
    qaWarning: 0,
    qaFail: 0,
    approved: 0,
    published: 0,
    updatedAt: 0,
  },
  page: [],
  isDone: true,
  continueCursor: "",
};

test.skip(!operatorToken, "Set ROADIQ_IMAGE_FACTORY_TEST_TOKEN for the controlled Image Factory auth test.");

test("operator login persists through page rendering and logout", async ({ page, context }) => {
  if (useDashboardFixture) {
    await page.route("**/api/internal/image-factory**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/session")) {
        await route.continue();
        return;
      }
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(dashboardFixture),
        });
        return;
      }
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Image Factory command could not be completed." }),
        });
        return;
      }
      await route.continue();
    });
  }

  await page.goto("/image-review", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Operator token")).toBeVisible();

  await page.getByLabel("Operator token").fill(operatorToken!);
  await page.getByRole("button", { name: "Open Image Factory" }).click();
  await expect(page.getByRole("button", { name: "Queue 3 candidates each" })).toBeVisible();
  await expect(page.getByLabel("Operator token")).toHaveCount(0);

  if (useDashboardFixture) {
    await page.getByRole("button", { name: "Queue 3 candidates each" }).click();
    await expect(page.getByText("Image Factory command could not be completed.", { exact: true })).toHaveCount(1);
  }

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Queue 3 candidates each" })).toBeVisible();
  await expect(context.cookies()).resolves.toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "roadiq_image_factory_session" }),
  ]));

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Operator token")).toBeVisible();
});
