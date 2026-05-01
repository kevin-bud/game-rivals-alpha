import { test, expect } from "@playwright/test";

test("landing page returns 200 and exposes the create-session form", async ({
  request,
  page,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Create session" })).toBeVisible();
});
