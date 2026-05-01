import { test, expect } from "@playwright/test";

/**
 * /s/:id with an id outside SESSION_ID_ALPHABET (e.g. contains `0`) must
 * return 404 with a small portrait page that explains the situation and
 * offers a "Create session" button posting to /api/session.
 */
test("invalid session id returns 404 with helpful page and Create session button", async ({
  page,
}) => {
  const response = await page.goto("/s/0000000");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "That link doesn't look right" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create session" })).toBeVisible();
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("width=device-width");
});
