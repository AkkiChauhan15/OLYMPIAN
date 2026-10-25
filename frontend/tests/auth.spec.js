import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const passphrase = "a stronger athlete every single day";
const uniqueEmail = () => `athlete-${crypto.randomUUID()}@example.test`;
async function signup(page, email = uniqueEmail(), name = "Alex Athlete") {
  await page.goto("/register");
  await page.getByLabel("Full name", { exact: true }).fill(name);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(passphrase);
  await page.getByLabel("Confirm password", { exact: true }).fill(passphrase);
  await page
    .getByLabel("Fitness goal", { exact: true })
    .selectOption("Muscle Gain");
  await page
    .getByLabel("Experience level", { exact: true })
    .selectOption("Intermediate");
  await page.getByLabel("Weekly frequency", { exact: true }).selectOption("4");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", {
      name: `Let’s make progress, ${name.split(" ")[0]}.`,
    }),
  ).toBeVisible();
  return email;
}
async function logout(page) {
  await page.getByLabel("Account menu", { exact: true }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/login");
}
async function signin(page, email, password = passphrase) {
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("real registration auto-signs in, persists on refresh and redirects guest pages", async ({
  page,
  context,
}) => {
  await signup(page);
  await expect(page.locator(".stat-number").first()).toHaveText("0sessions");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let’s make progress, Alex." }),
  ).toBeVisible();
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "olympian.sid");
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Lax");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    "olympian.sid",
  );
  await page.goto("/login");
  await expect(page).toHaveURL("/");
  await page.goto("/register");
  await expect(page).toHaveURL("/");
});

test("real login gives generic wrong-password errors and logout protects routes", async ({
  page,
}) => {
  const email = await signup(page);
  await logout(page);
  await signin(page, email, "this is the wrong passphrase");
  await expect(page.getByRole("alert")).toContainText(
    "Invalid email or password",
  );
  await signin(page, email);
  await expect(page).toHaveURL("/");
  await logout(page);
  for (const path of [
    "/",
    "/workouts",
    "/planner",
    "/challenges",
    "/leaderboard",
    "/profile",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL("/login");
    await expect(page.locator(".stat-number")).toHaveCount(0);
  }
});

test("registration validates confirmation and reports normalized duplicate email", async ({
  page,
}) => {
  const email = await signup(page);
  await logout(page);
  await page.goto("/register");
  await page.getByLabel("Full name", { exact: true }).fill("Alex Athlete");
  await page
    .getByLabel("Email address", { exact: true })
    .fill(email.toUpperCase());
  await page.getByLabel("Password", { exact: true }).fill(passphrase);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("a completely different passphrase");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("passwords don’t match");
  await page.getByLabel("Confirm password", { exact: true }).fill(passphrase);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "An account with this email already exists",
  );
  await expect(page).toHaveURL("/register");
});

test("real authenticated workouts, plans, joins and profile edits remain functional", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signup(page);
  await page.goto("/challenges");
  await page
    .getByRole("button", { name: "Join challenge", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Joined", exact: true }),
  ).toBeDisabled();
  await page.goto("/workouts?log=1");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Duration").fill("30");
  await dialog.getByLabel("Exercise 1 name", { exact: true }).fill("Squats");
  await dialog
    .getByLabel("Exercise 1 set 1 repetitions", { exact: true })
    .fill("10");
  await dialog
    .getByLabel("Exercise 1 set 1 weight in kilograms", { exact: true })
    .fill("20");
  await dialog
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".stat-number").first()).toHaveText("1sessions");
  await expect(page.locator(".stat-number").last()).toHaveText("200kg");
  await page.goto("/planner");
  await page.getByRole("button", { name: "Generate my workout plan" }).click();
  await expect(page.locator(".saved-plan")).toHaveCount(1);
  await page.goto("/leaderboard");
  await expect(page.locator(".your-ranking")).toContainText("10");
  await page.goto("/profile");
  await page.getByLabel("Full name", { exact: true }).fill("Alex Strong");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".account-name")).toContainText("Alex Strong");
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Strong",
  );
  expect(errors).toEqual([]);
});

test("logging into a different account clears the prior athlete’s data", async ({
  page,
}) => {
  const first = await signup(page);
  await page.goto("/planner");
  await page.getByRole("button", { name: "Generate my workout plan" }).click();
  await expect(page.locator(".saved-plan")).toHaveCount(1);
  await logout(page);
  await signup(page, uniqueEmail(), "Jordan Athlete");
  await page.goto("/planner");
  await expect(page.locator(".saved-plan")).toHaveCount(0);
  await expect(page.getByText("Your next routine starts above")).toBeVisible();
  await logout(page);
  await signin(page, first);
  await expect(page).toHaveURL("/");
  await page.goto("/planner");
  await expect(page.locator(".saved-plan")).toHaveCount(1);
});

for (const width of [320, 390, 768, 1440])
  test(`authentication screens fit ${width}px and password visibility works`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator(".auth-story h2")
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      const input = page.getByLabel("Password", { exact: true });
      await input.fill(passphrase);
      await page
        .getByRole("button", { name: "Show password", exact: true })
        .click();
      await expect(input).toHaveAttribute("type", "text");
      await page
        .getByRole("button", { name: "Hide password", exact: true })
        .click();
      await expect(input).toHaveAttribute("type", "password");
    }
  });

for (const width of [390, 1440])
  test(`authentication screens pass automated accessibility checks at ${width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect
        .soft(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
          path,
        )
        .toEqual([]);
    }
  });
