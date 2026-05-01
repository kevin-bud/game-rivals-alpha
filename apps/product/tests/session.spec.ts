import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Verification suite for the Lanes vertical slice on top of the realtime
 * substrate.
 *
 * The previous substrate-only contract was:
 *
 *   1. `/` is a portrait, mobile-first landing page exposing a
 *      "Create session" action.
 *   2. Submitting the form routes the user to `/s/:id` with a freshly minted
 *      session id.
 *   3. `/s/:id` renders the shareable URL and a status overlay.
 *   4. Two clients on the same `/s/:id` reach the running state.
 *   5. A third client is rejected with "Session full".
 *
 * Selectors are semantic (`getByRole`, `getByTestId`, `getByText`).
 *
 * Note: under the Lanes slice the session page no longer exposes a single
 * status string with roster counts — instead it transitions a role badge
 * and an overlay. The Reviewer typically extends this suite to cover the
 * full game state machine; the engineer-side tests below keep the
 * structural smoke checks and adapt the role / overlay assertions.
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

test("Create session mints a fresh id and routes to /s/:id with role + lane buttons", async ({
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

  // The first client to connect becomes the Pilot.
  await expect(page.getByTestId("role")).toHaveText("You are the Pilot", {
    timeout: 10_000,
  });

  // While only one client is connected, the lobby overlay shows the share URL.
  await expect(page.getByTestId("overlay")).toBeVisible();
  await expect(page.getByText(`/s/${sessionId}`)).toBeVisible();

  // Lane buttons are rendered with Pilot labels.
  await expect(page.getByTestId("lane-0")).toHaveText("← Left");
  await expect(page.getByTestId("lane-1")).toHaveText("Centre");
  await expect(page.getByTestId("lane-2")).toHaveText("Right →");
});

test("two clients on the same /s/:id reach the running phase", async ({ browser }) => {
  const sessionId = freshSessionId();
  const sessionPath = `/s/${sessionId}`;

  const pageA = await openSessionPage(browser, sessionPath);
  const pageB = await openSessionPage(browser, sessionPath);

  try {
    // First in is Pilot, second in is Spawner.
    await expect(pageA.getByTestId("role")).toHaveText("You are the Pilot", {
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("role")).toHaveText("You are the Spawner", {
      timeout: 10_000,
    });

    // After a 3 s countdown, both should reach the running phase: the
    // overlay hides and the timer shows a number close to 30 seconds.
    await expect(pageA.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });
    await expect(pageB.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });

    // Pilot sees the runner.
    await expect(pageA.getByTestId("runner")).toBeVisible();
    // Spawner sees a delayed ghost-runner indicator instead.
    await expect(pageB.getByTestId("ghost-runner")).toBeVisible();
  } finally {
    await pageA.context().close();
    await pageB.context().close();
  }
});

test("third client to a full session sees Session full overlay", async ({ browser }) => {
  const sessionId = freshSessionId();
  const sessionPath = `/s/${sessionId}`;

  const pageA = await openSessionPage(browser, sessionPath);
  const pageB = await openSessionPage(browser, sessionPath);

  try {
    await expect(pageA.getByTestId("role")).toHaveText("You are the Pilot", {
      timeout: 10_000,
    });
    await expect(pageB.getByTestId("role")).toHaveText("You are the Spawner", {
      timeout: 10_000,
    });

    const pageC = await openSessionPage(browser, sessionPath);
    try {
      await expect(pageC.getByRole("heading", { name: "Session full" })).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await pageC.context().close();
    }
  } finally {
    if (!pageA.isClosed()) {
      await pageA.context().close();
    }
    if (!pageB.isClosed()) {
      await pageB.context().close();
    }
  }
});
