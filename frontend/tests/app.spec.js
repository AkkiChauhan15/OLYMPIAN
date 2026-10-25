import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("dashboard uses API statistics, charts and saved workout details", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Let’s make progress, Alex." }),
  ).toBeVisible();
  const cards = page.locator(".stat-card");
  await expect(cards.nth(0).locator(".stat-number")).toHaveText("1sessions");
  await expect(cards.nth(1).locator(".stat-number")).toHaveText("45min");
  await expect(cards.nth(2).locator(".stat-number")).toHaveText("2sets");
  await expect(cards.nth(3).locator(".stat-number")).toHaveText("930kg");
  await expect(page.locator(".activity-chart")).toBeVisible();
  await page.getByRole("button", { name: "Monday, Full Body" }).click();
  await expect(page.locator(".day-exercises")).toContainText("Squats");
  await page.getByRole("button", { name: /Push Day.*45 min/ }).click();
  await expect(page.locator(".workout-details")).toContainText(
    "12 reps × 40 kg",
  );
  await expect(
    page.getByRole("link", { name: "Open planner" }),
  ).toHaveAttribute("href", "/planner");
  expect(errors).toEqual([]);
});

test("logs multiple exercises and sets with exact backend contract and refreshes statistics", async ({
  page,
}) => {
  const fixture = await mockApi(page);
  await page.goto("/workouts?log=1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Duration").fill("50");
  await dialog
    .getByLabel("Exercise 1 name", { exact: true })
    .fill("Bench Press");
  await dialog
    .getByLabel("Exercise 1 set 1 repetitions", { exact: true })
    .fill("12");
  await dialog
    .getByLabel("Exercise 1 set 1 weight in kilograms", { exact: true })
    .fill("40");
  await dialog.getByRole("button", { name: "Add set", exact: true }).click();
  await dialog
    .getByLabel("Exercise 1 set 2 repetitions", { exact: true })
    .fill("10");
  await dialog
    .getByLabel("Exercise 1 set 2 weight in kilograms", { exact: true })
    .fill("45");
  await dialog
    .getByRole("button", { name: "Add exercise", exact: true })
    .click();
  await dialog.getByLabel("Exercise 2 name", { exact: true }).fill("Push-ups");
  await dialog
    .getByLabel("Exercise 2 set 1 repetitions", { exact: true })
    .fill("20");
  await dialog
    .getByRole("button", { name: "Add exercise", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Remove exercise 3", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Save workout", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Workout saved. Another step stronger."),
  ).toBeVisible();
  const saved = fixture.requests.find(
    (r) => r.method === "POST" && r.path === "/api/workouts",
  );
  expect(saved.body).toEqual({
    workoutType: "Strength",
    durationMinutes: 50,
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { reps: 12, weightKg: 40 },
          { reps: 10, weightKg: 45 },
        ],
      },
      { name: "Push-ups", sets: [{ reps: 20, weightKg: 0 }] },
    ],
  });
  await expect(
    page.locator(".stat-card").nth(0).locator(".stat-number"),
  ).toHaveText("2sessions");
  await page
    .getByRole("searchbox", { name: "Search workouts or exercises" })
    .fill("Push-ups");
  await expect(page.locator(".workout-row")).toHaveCount(1);
  await page.getByRole("button", { name: /Strength.*50 min/ }).click();
  await expect(page.locator(".workout-details")).toContainText("Push-ups");
});

test("workout validation prevents empty requests and failed saves preserve entries", async ({
  page,
}) => {
  const fixture = await mockApi(page, { failSave: true });
  await page.goto("/workouts?log=1");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Save workout" }).click();
  expect(fixture.requests.filter((r) => r.method === "POST")).toHaveLength(0);
  await dialog.getByLabel("Duration").fill("20");
  await dialog.getByLabel("Exercise 1 name", { exact: true }).fill("Squats");
  await dialog
    .getByLabel("Exercise 1 set 1 repetitions", { exact: true })
    .fill("10");
  await dialog.getByRole("button", { name: "Save workout" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Test save failed");
  await expect(
    dialog.getByLabel("Exercise 1 name", { exact: true }),
  ).toHaveValue("Squats");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("planner sends valid preferences and renders saved plans and rest days", async ({
  page,
}) => {
  const fixture = await mockApi(page);
  await page.goto("/planner");
  await expect(
    page.getByRole("heading", { name: "Your goals. Your game plan." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Weight Loss Move more/ }).click();
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await page
    .getByRole("button", { name: "5 days / week", exact: true })
    .click();
  await page.getByRole("button", { name: "Generate my workout plan" }).click();
  await expect(
    page.getByText("Your plan is ready. Let’s build some momentum."),
  ).toBeVisible();
  expect(
    fixture.requests.find((r) => r.path === "/api/plans/generate").body,
  ).toEqual({
    goal: "Weight Loss",
    experienceLevel: "Advanced",
    workoutDaysPerWeek: 5,
  });
  await expect(page.locator(".planner-result")).toContainText(
    "Weight Loss · Advanced · 5 training days",
  );
  await page.getByRole("button", { name: "Sunday, Rest" }).click();
  await expect(page.locator(".rest-message")).toContainText("Recovery");
  await expect(page.locator(".saved-plan")).toHaveCount(2);
  await page.locator(".saved-plan").filter({ hasText: "Muscle Gain" }).click();
  await expect(page.locator(".planner-result")).toContainText(
    "Muscle Gain · Intermediate · 4 training days",
  );
});

for (const duplicate of [false, true])
  test(`challenge joining handles ${duplicate ? "duplicate participation" : "success"} and actual progress`, async ({
    page,
  }) => {
    const fixture = await mockApi(page, { duplicate });
    await page.goto("/challenges");
    await expect(page.locator(".challenge-card")).toHaveCount(3);
    await page.getByRole("button", { name: "Active", exact: true }).click();
    await expect(page.locator(".challenge-card")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Join challenge", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Joined", exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".challenge-progress")).toContainText("0 / 12");
    expect(fixture.requests.find((r) => r.path.endsWith("/join")).body).toEqual(
      {},
    );
    await page.getByRole("link", { name: "Rankings", exact: true }).click();
    await expect(page.locator(".your-ranking")).toContainText("#5");
  });

test("leaderboard displays aggregation rankings including top three and full lineup", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/leaderboard?challenge=challenge-active");
  await expect(page.locator(".podium-card")).toHaveCount(3);
  await expect(page.locator(".podium-card.rank-1")).toContainText("Sam Rivera");
  await expect(page.locator(".ranking-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".ranking-table tbody tr").last()).toContainText(
    "Casey Park",
  );
  await page.getByLabel("CHOOSE YOUR ARENA").selectOption("challenge-upcoming");
  await expect(page).toHaveURL(/challenge=challenge-upcoming/);
});

test("profile only edits supported fields and refreshes the selected athlete", async ({
  page,
}) => {
  const fixture = await mockApi(page);
  await page.goto("/profile");
  await page.getByLabel("Full name", { exact: true }).fill("Alex Strong");
  await page
    .getByLabel("Fitness goal", { exact: true })
    .selectOption("General Fitness");
  await page
    .getByLabel("Weekly workout frequency", { exact: true })
    .selectOption("6");
  await expect(page.getByLabel("Email address")).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Profile updated. Your goals are set."),
  ).toBeVisible();
  await expect(page.locator(".account-name")).toContainText("Alex Strong");
  expect(fixture.requests.find((r) => r.method === "PATCH").body).toEqual({
    name: "Alex Strong",
    fitnessGoal: "General Fitness",
    experienceLevel: "Intermediate",
    workoutDaysPerWeek: 6,
  });
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
});

test("expired sessions clear protected content and redirect to login", async ({
  page,
}) => {
  const fixture = await mockApi(page);
  await page.goto("/");
  await expect(page.locator(".stat-number").first()).toHaveText("1sessions");
  fixture.expireSession();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Leaderboard", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(".stat-number")).toHaveCount(0);
});

test("authentication initialization errors show a retry state", async ({
  page,
}) => {
  const fixture = await mockApi(page, { failMe: true });
  await page.goto("/");
  await expect(page.getByText("Test backend unavailable")).toBeVisible();
  await expect(page.locator(".stat-number")).toHaveCount(0);
  fixture.recoverMe();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".stat-number").first()).toHaveText("1sessions");
});

test("statistics failure can be retried independently", async ({ page }) => {
  const fixture = await mockApi(page, { failStats: true });
  await page.goto("/workouts");
  await expect(page.getByText("Test statistics unavailable")).toBeVisible();
  await expect(page.locator(".stat-number")).toHaveCount(0);
  fixture.recoverStats();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator(".stat-number").first()).toHaveText("1sessions");
});

test("empty records and empty leaderboards give useful next steps", async ({
  page,
}) => {
  await mockApi(page, { empty: true, emptyBoard: true });
  await page.goto("/");
  await expect(page.getByText("Your first win is waiting")).toBeVisible();
  await expect(page.getByText("A good week starts with a plan")).toBeVisible();
  await page.goto("/leaderboard");
  await expect(
    page.getByRole("heading", { name: "The podium is waiting" }),
  ).toBeVisible();
  await page.goto("/planner");
  await expect(page.getByText("Your next routine starts above")).toBeVisible();
});

test("empty challenge collections remain navigable for authenticated users", async ({
  page,
}) => {
  await mockApi(page, { noChallenges: true });
  await page.goto("/challenges");
  await expect(
    page.getByRole("heading", { name: "The arena is warming up" }),
  ).toBeVisible();
});

for (const width of [320, 390, 768, 1440])
  test(`all routes fit viewport at ${width}px and mobile navigation works`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockApi(page);
    for (const path of [
      "/",
      "/workouts",
      "/planner",
      "/challenges",
      "/leaderboard",
      "/profile",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        path,
      ).toBe(true);
    }
    if (width <= 768) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await expect(
        page
          .getByRole("navigation")
          .getByRole("link", { name: "Dashboard", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "Challenges", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Find your competitive edge." }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open navigation" }),
      ).toHaveAttribute("aria-expanded", "false");
    }
  });

test("confirmed membership persists when the user is outside the top 20", async ({
  page,
}) => {
  await mockApi(page, { omitMembership: true });
  await page.goto("/challenges");
  await page
    .getByRole("button", { name: "Join challenge", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Joined", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Joined. Progress is currently unavailable in the top 20 rankings.",
    ),
  ).toBeVisible();
  await expect(page.locator(".challenge-progress")).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Dashboard", exact: true })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Challenges", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Joined", exact: true }),
  ).toBeDisabled();
});

test("incomplete statistics are reported rather than converted to zero", async ({
  page,
}) => {
  await mockApi(page, { incompleteStats: true });
  await page.goto("/");
  await expect(
    page.getByText(
      "The statistics API returned incomplete data. Please retry.",
    ),
  ).toBeVisible();
  await expect(page.locator(".stat-number")).toHaveCount(0);
});

for (const width of [390, 1440])
  test(`all routes meet automated WCAG A/AA checks at ${width}px`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 1000 });
    await mockApi(page);
    for (const path of [
      "/",
      "/workouts",
      "/planner",
      "/challenges",
      "/leaderboard",
      "/profile",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator(".skeleton")).toHaveCount(0);
      if (path === "/" || path === "/planner")
        await page.getByRole("button", { name: "Monday, Full Body" }).click();
      if (path === "/" || path === "/workouts")
        await page.getByRole("button", { name: /Push Day.*45 min/ }).click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect
        .soft(
          result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
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

test("workout dialog passes automated accessibility checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/workouts?log=1");
  await expect(page.getByRole("dialog")).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("reduced motion and keyboard modal dismissal work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page);
  await page.goto("/workouts");
  await page.getByRole("button", { name: "Log workout", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log workout", exact: true }),
  ).toBeFocused();
});

test("a delayed profile response cannot restore an account after logout", async ({
  page,
}) => {
  await mockApi(page);
  let release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/users/me", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    await delayed;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          _id: "athlete-one",
          name: "Stale Athlete",
          email: "stale@example.test",
          fitnessGoal: "General Fitness",
          experienceLevel: "Beginner",
          workoutDaysPerWeek: 3,
        },
      }),
    });
  });
  await page.goto("/profile");
  await page.getByLabel("Full name", { exact: true }).fill("Alex Updated");
  const pending = page.waitForRequest((r) => r.method() === "PATCH");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await pending;
  await page.getByLabel("Account menu", { exact: true }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/login");
  const completed = page.waitForResponse(
    (r) => r.request().method() === "PATCH",
  );
  release();
  await completed;
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});
