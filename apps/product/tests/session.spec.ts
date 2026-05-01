import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Verification suite for the realtime two-phone session scaffold.
 *
 * The five contract points (from the task DoD) covered here:
 *
 *   1. `/` is a portrait, mobile-first landing page exposing a
 *      "Create session" action.
 *   2. Submitting the form routes the user to `/s/:id` with a freshly minted
 *      session id.
 *   3. `/s/:id` renders the shareable URL prominently and a status line.
 *   4. Two clients on the same `/s/:id` reach `2 of 2 connected`.
 *   5. A third client is rejected with "Session full"; the original two stay
 *      at `2 of 2 connected`. When one of the original two disconnects, the
 *      remaining one drops back to `1 of 2 connected`.
 *
 * Selectors are semantic (`getByRole`, `getByTestId`, `getByText`).
 */

const SESSION_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function freshSessionId(): string {
  // Use a per-run id so parallel runs do not collide on state.
  let id = "rv";
  for (let i = 0; i < 5; i += 1) {
    const idx = Math.floor(Math.random() * SESSION_ID_ALPHABET.length);
    id += SESSION_ID_ALPHABET[idx];
  }
  return id;
}

async function openSessionPage(browser: Browser, sessionPath: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(sessionPath);
  return page;
}

test("landing page is mobile-first and exposes Create session", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  const viewport = page.locator('meta[name="viewport"]');
  await expect(viewport).toHaveAttribute(
    "content",
    /width=device-width.*initial-scale=1.*viewport-fit=cover/,
  );

  await expect(page.getByRole("button", { name: "Create session" })).toBeVisible();
});

test("Create session mints a fresh id and routes to /s/:id with share + status", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Create session" }).click();
  await page.waitForURL(/\/s\/[a-z2-9]+$/);

  const url = new URL(page.url());
  const match = url.pathname.match(/^\/s\/([a-z2-9]+)$/);
  expect(match).not.toBeNull();
  if (match === null) {
    throw new Error("session id pattern did not match");
  }
  const sessionId = match[1];
  expect(sessionId.length).toBeGreaterThanOrEqual(4);
  expect(sessionId.length).toBeLessThanOrEqual(16);
  for (const ch of sessionId) {
    expect(SESSION_ID_ALPHABET.includes(ch)).toBe(true);
  }

  const shareUrl = page.getByTestId("share-url");
  await expect(shareUrl).toBeVisible();
  await expect(shareUrl).toContainText(`/s/${sessionId}`);

  const status = page.getByTestId("status");
  await expect(status).toBeVisible();
  // Eventually shows roster — at minimum reaches 1 of 2 connected.
  await expect(status).toHaveText("1 of 2 connected", { timeout: 10_000 });
});

test("two clients on the same /s/:id both reach 2 of 2 connected", async ({ browser }) => {
  const sessionId = freshSessionId();
  const sessionPath = `/s/${sessionId}`;

  const pageA = await openSessionPage(browser, sessionPath);
  const pageB = await openSessionPage(browser, sessionPath);

  try {
    await expect(pageA.getByTestId("status")).toHaveText("2 of 2 connected", {
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("status")).toHaveText("2 of 2 connected", {
      timeout: 10_000,
    });
  } finally {
    await pageA.context().close();
    await pageB.context().close();
  }
});

test("third client gets Session full; original two remain at 2 of 2; disconnect drops to 1 of 2", async ({
  browser,
}) => {
  const sessionId = freshSessionId();
  const sessionPath = `/s/${sessionId}`;

  const pageA = await openSessionPage(browser, sessionPath);
  const pageB = await openSessionPage(browser, sessionPath);

  try {
    await expect(pageA.getByTestId("status")).toHaveText("2 of 2 connected", {
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("status")).toHaveText("2 of 2 connected", {
      timeout: 10_000,
    });

    const pageC = await openSessionPage(browser, sessionPath);
    try {
      await expect(pageC.getByTestId("status")).toHaveText("Session full", {
        timeout: 10_000,
      });

      // The original two should still report 2 of 2 connected.
      await expect(pageA.getByTestId("status")).toHaveText("2 of 2 connected");
      await expect(pageB.getByTestId("status")).toHaveText("2 of 2 connected");
    } finally {
      await pageC.context().close();
    }

    // Close pageB; pageA should drop back to 1 of 2 connected.
    await pageB.context().close();
    await expect(pageA.getByTestId("status")).toHaveText("1 of 2 connected", {
      timeout: 10_000,
    });
  } finally {
    if (!pageA.isClosed()) {
      await pageA.context().close();
    }
  }
});
