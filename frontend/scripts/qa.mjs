import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mockApi } from "../tests/fixtures.js";

// Visual fixtures only. Never connect this helper to an existing Atlas account.
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/usr/bin/google-chrome")
      ? "/usr/bin/google-chrome"
      : undefined),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockApi(page, { authenticated: false });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const path of ["/login", "/register"]) {
      await page.goto(`http://127.0.0.1:5173${path}`);
      await page.locator("h1").waitFor();
      await page.screenshot({
        path: `/tmp/olympian-${path.slice(1)}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.unroute("**/api/**");
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 1100 });
  for (const path of [
    "/",
    "/planner",
    "/challenges",
    "/leaderboard",
    "/profile",
  ]) {
    await page.goto(`http://127.0.0.1:5173${path}`);
    await page.waitForFunction(
      () =>
        !!document.querySelector("h1") && !document.querySelector(".skeleton"),
    );
    await page.screenshot({
      path: `/tmp/olympian-${path.slice(1) || "dashboard"}-desktop.png`,
      fullPage: true,
    });
  }
  console.log(
    JSON.stringify({
      screenshots:
        "9 isolated-fixture screenshots saved under /tmp/olympian-*.png",
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
