import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * Verifies the polish-2 contract: per-slot cumulative wins.
 *
 * The decisive assertion is the slot-indexing one. Roles swap each round
 * (existing Play-Again behaviour), but slots are stable. Driving two
 * Spawner-wins rounds back-to-back across a single Play-Again means the
 * round winners are *different slots* — the first round goes to the
 * originally-Spawner slot, the second to the originally-Pilot slot
 * (because they have become the new Spawner). Score after round two
 * must be 1 · 1 from both perspectives. A buggy role-indexed
 * implementation would produce 2 · 0 (the spawner role won twice) and
 * fail this assertion.
 *
 * Selectors are semantic (`getByTestId`).
 */

const SESSION_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function freshSessionId(): string {
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

async function driveSpawnerWin(pilot: Page, spawner: Page): Promise<void> {
  // Pilot pins lane 1; Spawner spams lane 1 every ~700 ms (per-lane
  // cooldown is 600 ms). Keep an upper bound so a stuck DO can't hang.
  await pilot.getByTestId("lane-1").click();
  for (let i = 0; i < 25; i += 1) {
    if (pilot.isClosed() || spawner.isClosed()) {
      return;
    }
    const overlayVisible = await spawner
      .getByTestId("overlay")
      .isVisible()
      .catch(() => false);
    if (overlayVisible) {
      return;
    }
    await spawner
      .getByTestId("lane-1")
      .click({ timeout: 2_000 })
      .catch(() => {});
    await spawner.waitForTimeout(700);
  }
}

test("Per-slot cumulative wins: two Spawner-wins rounds across role-swap give 1 · 1, not 2 · 0", async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const sessionId = freshSessionId();
  const sessionPath = `/s/${sessionId}`;

  // First connection becomes Pilot (slot 0); second becomes Spawner (slot 1).
  const slotAPage = await openSessionPage(browser, sessionPath);
  const slotBPage = await openSessionPage(browser, sessionPath);

  try {
    // (A) Initial role assignment + initial score state.
    await expect(slotAPage.getByTestId("role")).toHaveText("You are the Pilot", {
      timeout: 10_000,
    });
    await expect(slotBPage.getByTestId("role")).toHaveText("You are the Spawner", {
      timeout: 10_000,
    });

    // Both clients see 0 · 0 once countdown starts. The persistent header
    // is shown during countdown and running phases.
    await expect(slotAPage.getByTestId("score")).toBeVisible({ timeout: 8_000 });
    await expect(slotBPage.getByTestId("score")).toBeVisible({ timeout: 8_000 });
    await expect(slotAPage.getByTestId("score-self")).toHaveText("0");
    await expect(slotAPage.getByTestId("score-other")).toHaveText("0");
    await expect(slotBPage.getByTestId("score-self")).toHaveText("0");
    await expect(slotBPage.getByTestId("score-other")).toHaveText("0");

    // Both clients reach running.
    await expect(slotAPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });
    await expect(slotBPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });

    // (B1) Round 1: slot A is Pilot, slot B is Spawner. Drive Spawner win.
    // Round-1 winner is slot B.
    await driveSpawnerWin(slotAPage, slotBPage);

    await expect(slotAPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await expect(slotBPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await expect(slotAPage.getByText(/You lost/i)).toBeVisible();
    await expect(slotBPage.getByText(/You won/i)).toBeVisible();

    // Overlay score after round 1: slot B (Spawner this round) won, slot A lost.
    await expect(slotBPage.getByTestId("overlay-score-self")).toHaveText("1");
    await expect(slotBPage.getByTestId("overlay-score-other")).toHaveText("0");
    await expect(slotAPage.getByTestId("overlay-score-self")).toHaveText("0");
    await expect(slotAPage.getByTestId("overlay-score-other")).toHaveText("1");

    // (C) Persistent score header is hidden under the over overlay (the
    // overlay carries its own copy). Use the score element's hidden
    // class — a CSS-hidden element should not be visible to Playwright.
    await expect(slotAPage.getByTestId("score")).toBeHidden();
    await expect(slotBPage.getByTestId("score")).toBeHidden();

    // (B2) Play again. Roles swap: slot A becomes Spawner, slot B becomes
    // Pilot. Slots are stable, so per-slot wins should still be 1 from
    // slot B's perspective and 0 from slot A's at the start of round 2.
    await slotAPage.getByTestId("play-again").click();

    await expect(slotAPage.getByTestId("countdown")).toBeVisible({ timeout: 5_000 });
    await expect(slotBPage.getByTestId("countdown")).toBeVisible({ timeout: 5_000 });

    await expect(slotAPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });
    await expect(slotBPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });

    await expect(slotAPage.getByTestId("role")).toHaveText("You are the Spawner");
    await expect(slotBPage.getByTestId("role")).toHaveText("You are the Pilot");

    // Persistent header carries the round-1 score across the swap.
    await expect(slotAPage.getByTestId("score")).toBeVisible();
    await expect(slotBPage.getByTestId("score")).toBeVisible();
    await expect(slotAPage.getByTestId("score-self")).toHaveText("0");
    await expect(slotAPage.getByTestId("score-other")).toHaveText("1");
    await expect(slotBPage.getByTestId("score-self")).toHaveText("1");
    await expect(slotBPage.getByTestId("score-other")).toHaveText("0");

    // Round 2: slot B is Pilot, slot A is Spawner. Drive Spawner win.
    // Round-2 winner is slot A.
    await driveSpawnerWin(slotBPage, slotAPage);

    await expect(slotAPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await expect(slotBPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });

    // Decisive assertion: each slot has won one round, so both sides see
    // 1 · 1. A role-indexed implementation would have the Spawner role
    // at 2 and the Pilot role at 0 — i.e. each client would see either
    // 2 · 0 or 0 · 2 depending on current role.
    await expect(slotAPage.getByTestId("overlay-score-self")).toHaveText("1");
    await expect(slotAPage.getByTestId("overlay-score-other")).toHaveText("1");
    await expect(slotBPage.getByTestId("overlay-score-self")).toHaveText("1");
    await expect(slotBPage.getByTestId("overlay-score-other")).toHaveText("1");
  } finally {
    await slotAPage.context().close();
    await slotBPage.context().close();
  }
});
