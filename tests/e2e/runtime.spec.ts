import { expect, test } from "@playwright/test";

test("serves localized app routes over isolated HTTPS", async ({ page }) => {
  const response = await page.goto("/en");

  expect(response?.url()).toMatch(/^https:/);
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);

  await page.goto("/zh");
  await expect(
    page.getByRole("heading", { name: "仪表盘", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
});

test("keeps the JoyID bridge outside app-wide COEP", async ({ request }) => {
  const response = await request.get("/joyid-sign-bridge");
  const headers = response.headers();

  expect(response.ok()).toBe(true);
  expect(headers["cross-origin-opener-policy"]).toBe(
    "same-origin-allow-popups",
  );
  expect(headers["cross-origin-embedder-policy"]).toBeUndefined();
});

test("keeps mobile payment controls above the fixed tab bar", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome");

  await page.goto("/en/payments");
  const tabBar = page.getByRole("navigation", { name: "Mobile navigation" });
  const readinessButton = page.getByRole("button", {
    name: "Check payment readiness",
  });

  await expect(tabBar).toBeVisible();
  await expect(readinessButton).toBeVisible();
  await readinessButton.scrollIntoViewIfNeeded();

  const [tabBarBox, buttonBox] = await Promise.all([
    tabBar.boundingBox(),
    readinessButton.boundingBox(),
  ]);

  expect(tabBarBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(tabBarBox!.y);
});
