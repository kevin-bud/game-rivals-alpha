import { test, expect, type Browser, type Page } from "@playwright/test";

/**
 * End-to-end verification for the Lanes vertical slice.
 *
 * Contract being checked (from the current-task spec, gating MVP "shipped"):
 *
 *   1. Two clients on the same /s/:id are deterministically assigned roles
 *      (first = Pilot, second = Spawner) and both clients can see their role.
 *   2. Phase reaches `running` within a few seconds of the second connection
 *      (overlay hides on both clients).
 *   3. Pilot can choose lanes and the runner moves; Spawner can drop blockers
 *      and they appear.
 *   4. A full round resolves with a winner overlay. We bias toward the
 *      Spawner-wins path (Pilot pinned to lane 1, Spawner spams lane 1) so
 *      the round terminates in seconds rather than waiting the full 30 s.
 *   5. "Play again" returns the session to a fresh countdown and a second
 *      round can be played.
 *
 * Selectors are semantic (`getByTestId`, `getByRole`, `getByText`) per the
 * Engineer's recipe.
 */

const SESSION_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function freshSessionId(): string {
  // Prefix must use only chars from SESSION_ID_ALPHABET — note that
  // `l`, `o`, `0`, `1` are excluded for legibility.
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

test("Lanes round resolves with Spawner win and play-again restarts a fresh round", async ({
  browser,
}) => {
  test.setTimeout(90_000);

  const sessionId = freshSessionId();
  const sessionPath = `/s/${sessionId}`;

  const pilotPage = await openSessionPage(browser, sessionPath);
  const spawnerPage = await openSessionPage(browser, sessionPath);

  try {
    // (1) Deterministic role assignment.
    await expect(pilotPage.getByTestId("role")).toHaveText("You are the Pilot", {
      timeout: 10_000,
    });
    await expect(spawnerPage.getByTestId("role")).toHaveText("You are the Spawner", {
      timeout: 10_000,
    });

    // (2) Both clients reach the running phase: countdown shows briefly,
    // then the overlay hides on both. Allow up to 8 s to cover the 3 s
    // server-side countdown plus connection jitter.
    await expect(pilotPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });
    await expect(spawnerPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });

    // Pilot sees the live runner; Spawner sees the delayed ghost-runner.
    await expect(pilotPage.getByTestId("runner")).toBeVisible();
    await expect(spawnerPage.getByTestId("ghost-runner")).toBeVisible();

    // (3) Pilot stays in the centre lane (lane 1).
    await pilotPage.getByTestId("lane-1").click();

    // Spawner spams Drop ▼ (lane 1) once per ~700 ms to clear the per-lane
    // 600 ms cooldown. Within ~10 s a blocker should reach row 11 in the
    // runner's lane.
    const spawnPromise = (async () => {
      // Cap the spam loop so a misbehaving DO does not hang the test.
      for (let i = 0; i < 25; i += 1) {
        if (pilotPage.isClosed() || spawnerPage.isClosed()) {
          return;
        }
        // Stop early if either client has already shown the over-overlay.
        const overlayVisible = await spawnerPage
          .getByTestId("overlay")
          .isVisible()
          .catch(() => false);
        if (overlayVisible) {
          return;
        }
        await spawnerPage
          .getByTestId("lane-1")
          .click({ timeout: 2_000 })
          .catch(() => {});
        await spawnerPage.waitForTimeout(700);
      }
    })();

    // (4) Round resolves: end-of-round overlay reappears with a winner
    // message and a Play again button. Spawner spam in lane 1 should
    // collide with the Pilot pinned to lane 1 well before 30 s.
    await expect(pilotPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await expect(spawnerPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await spawnPromise;

    // The Pilot lost (Spawner won) — Pilot sees a losing message, Spawner
    // sees a winning message. Both must expose a Play again control.
    await expect(pilotPage.getByText(/You lost/i)).toBeVisible();
    await expect(spawnerPage.getByText(/You won/i)).toBeVisible();
    await expect(pilotPage.getByTestId("play-again")).toBeVisible();
    await expect(spawnerPage.getByTestId("play-again")).toBeVisible();

    // (5) Play again from one client resets to a fresh countdown and the
    // round runs again. Roles must persist (Pilot stays Pilot, Spawner
    // stays Spawner — no role swap in this slice).
    await pilotPage.getByTestId("play-again").click();

    // The countdown banner appears on both clients during the 3 s
    // pre-round phase.
    await expect(pilotPage.getByTestId("countdown")).toBeVisible({ timeout: 5_000 });
    await expect(spawnerPage.getByTestId("countdown")).toBeVisible({ timeout: 5_000 });

    // Then the round starts again and the overlay hides.
    await expect(pilotPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });
    await expect(spawnerPage.getByTestId("overlay")).toBeHidden({ timeout: 8_000 });

    // Roles unchanged.
    await expect(pilotPage.getByTestId("role")).toHaveText("You are the Pilot");
    await expect(spawnerPage.getByTestId("role")).toHaveText("You are the Spawner");

    // Drive the second round to a Spawner win the same way to confirm the
    // tick loop and collision detection survived the reset.
    await pilotPage.getByTestId("lane-1").click();

    for (let i = 0; i < 25; i += 1) {
      const overlayVisible = await spawnerPage
        .getByTestId("overlay")
        .isVisible()
        .catch(() => false);
      if (overlayVisible) {
        break;
      }
      await spawnerPage
        .getByTestId("lane-1")
        .click({ timeout: 2_000 })
        .catch(() => {});
      await spawnerPage.waitForTimeout(700);
    }

    await expect(pilotPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await expect(spawnerPage.getByTestId("overlay")).toBeVisible({ timeout: 25_000 });
    await expect(pilotPage.getByTestId("play-again")).toBeVisible();
  } finally {
    await pilotPage.context().close();
    await spawnerPage.context().close();
  }
});
