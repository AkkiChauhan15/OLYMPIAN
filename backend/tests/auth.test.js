const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const argon2 = require("argon2");
const { randomBytes } = require("node:crypto");
const { isolatedApp } = require("./helpers");
const { createApp } = require("../app");
const { readConfig } = require("../config");
const User = require("../models/User");
const Workout = require("../models/Workout");
const WorkoutPlan = require("../models/WorkoutPlan");
const Challenge = require("../models/Challenge");
const ChallengeEntry = require("../models/ChallengeEntry");

const origin = "http://127.0.0.1:5173";
const password = "a long test passphrase 2026";
let harness, app;
const registration = (overrides = {}) => ({
  name: "Alex Athlete",
  email: "alex@example.test",
  password,
  fitnessGoal: "Muscle Gain",
  experienceLevel: "Intermediate",
  workoutDaysPerWeek: 4,
  ...overrides,
});
const post = (agent, path, body) =>
  agent.post(path).set("Origin", origin).send(body);
const cookie = (response) => response.headers["set-cookie"][0].split(";")[0];
async function register(overrides = {}) {
  const agent = request.agent(app);
  const result = await post(
    agent,
    "/api/auth/register",
    registration(overrides),
  ).expect(201);
  return { agent, user: result.body.user, result };
}
before(async () => {
  harness = await isolatedApp();
  app = harness.app;
});
after(async () => {
  if (harness) await harness.close();
});
beforeEach(async () => {
  for (const collection of Object.values(mongoose.connection.collections))
    await collection.deleteMany({});
});

test("registration normalizes email, hashes with Argon2id, saves preferences and signs in", async () => {
  const { agent, user, result } = await register({
    email: "  Alex@EXAMPLE.test  ",
  });
  assert.equal(user.email, "alex@example.test");
  assert.equal(user.workoutDaysPerWeek, 4);
  assert.equal(user.passwordHash, undefined);
  assert.equal(user.password, undefined);
  const stored = await User.findById(user._id).select("+passwordHash");
  assert.match(stored.passwordHash, /^\$argon2id\$/);
  assert(await argon2.verify(stored.passwordHash, password));
  assert.equal((await User.findById(user._id)).passwordHash, undefined);
  assert.equal(stored.toJSON().passwordHash, undefined);
  await agent.get("/api/auth/me").expect(200);
  assert.match(result.headers["set-cookie"][0], /HttpOnly/);
  assert.match(result.headers["set-cookie"][0], /SameSite=Lax/);
  assert.equal(result.headers["cache-control"], "no-store");
});

test("normalized duplicate registration returns 409 without overwriting credentials", async () => {
  await register();
  const original = (await User.findOne().select("+passwordHash")).passwordHash;
  await post(
    request(app),
    "/api/auth/register",
    registration({
      email: " ALEX@example.test ",
      password: "different test passphrase",
    }),
  ).expect(409);
  assert.equal(await User.countDocuments(), 1);
  assert.equal(
    (await User.findOne().select("+passwordHash")).passwordHash,
    original,
  );
});

test("invalid and sensitive registration fields are rejected without creating records", async () => {
  const values = [
    { name: " " },
    { email: "not-email" },
    { email: { $ne: null } },
    { password: "short" },
    { password: "x".repeat(129) },
    { experienceLevel: "Expert" },
    { workoutDaysPerWeek: 8 },
    { fitnessGoal: "Anything" },
    { passwordHash: "forged" },
    { role: "admin" },
  ];
  for (const value of values)
    await post(request(app), "/api/auth/register", registration(value)).expect(
      400,
    );
  assert.equal(await User.countDocuments(), 0);
});

test("login verifies credentials, persists in MongoDB and restores in a new app instance", async () => {
  await register();
  const result = await post(request(app), "/api/auth/login", {
    email: " ALEX@example.test ",
    password,
  }).expect(200);
  const restarted = await createApp({
    config: harness.config,
    client: mongoose.connection.getClient(),
    authLimit: 500,
  });
  const me = await request(restarted)
    .get("/api/auth/me")
    .set("Cookie", cookie(result))
    .expect(200);
  assert.equal(me.body.user.email, "alex@example.test");
  assert(
    (await mongoose.connection.collection("sessions").countDocuments()) > 0,
  );
});

test("incorrect password, missing account and legacy account return the same generic error", async () => {
  await register();
  await User.collection.insertOne({
    name: "Legacy",
    email: " Legacy@Example.test ",
    fitnessGoal: "General Fitness",
    experienceLevel: "Beginner",
    workoutDaysPerWeek: 3,
  });
  const results = [];
  for (const email of [
    "alex@example.test",
    "missing@example.test",
    "legacy@example.test",
  ]) {
    const result = await post(request(app), "/api/auth/login", {
      email,
      password: "the wrong passphrase here",
    }).expect(401);
    results.push(result.body);
  }
  assert.deepEqual(
    results,
    Array(3).fill({ message: "Invalid email or password" }),
  );
  await post(
    request(app),
    "/api/auth/register",
    registration({ email: "legacy@example.test" }),
  ).expect(409);
  assert.equal(await User.countDocuments(), 2);
});

test("ambiguous canonical legacy email records cannot be logged in or claimed", async () => {
  const hash = await argon2.hash(password);
  await User.collection.insertMany([
    { name: "One", email: " ALEX@example.test ", passwordHash: hash },
    { name: "Two", email: "alex@example.test", passwordHash: hash },
  ]);
  await post(request(app), "/api/auth/login", {
    email: "alex@example.test",
    password,
  }).expect(401);
  await post(request(app), "/api/auth/register", registration()).expect(409);
});

test("logout destroys the session and clears the cookie; replay is denied", async () => {
  const { agent, result } = await register();
  const loggedOut = await post(agent, "/api/auth/logout", {}).expect(200);
  assert.match(loggedOut.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/);
  await agent.get("/api/auth/me").expect(401);
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", cookie(result))
    .expect(401);
  assert.equal(
    await mongoose.connection.collection("sessions").countDocuments(),
    0,
  );
});

test("all fitness and account endpoints require authentication", async () => {
  const id = new mongoose.Types.ObjectId();
  for (const path of [
    "/api/auth/me",
    "/api/users",
    `/api/workouts/user/${id}`,
    `/api/workouts/stats/${id}`,
    `/api/plans/user/${id}`,
    "/api/challenges",
    `/api/challenges/${id}/leaderboard`,
  ])
    await request(app).get(path).expect(401);
  for (const path of [
    "/api/workouts",
    "/api/plans/generate",
    "/api/challenges",
    `/api/challenges/${id}/join`,
  ])
    await post(request(app), path, {}).expect(401);
  await request(app)
    .patch("/api/users/me")
    .set("Origin", origin)
    .send({ name: "Intruder" })
    .expect(401);
});

test("authenticated users cannot read another user’s workouts, stats or plans", async () => {
  const { agent } = await register();
  const other = await User.create({
    name: "Other",
    email: "other@example.test",
  });
  for (const path of [
    `/api/workouts/user/${other.id}`,
    `/api/workouts/stats/${other.id}`,
    `/api/plans/user/${other.id}`,
  ])
    await agent.get(path).expect(403);
  await agent.get("/api/workouts/user/not-an-id").expect(400);
});

test("workout creation derives the session owner and preserves aggregation", async () => {
  const { agent, user } = await register();
  const body = {
    workoutType: "Push",
    durationMinutes: 40,
    exercises: [{ name: "Bench Press", sets: [{ reps: 10, weightKg: 40 }] }],
  };
  const created = await post(agent, "/api/workouts", body).expect(201);
  assert.equal(created.body.workout.userId, user._id);
  await post(agent, "/api/workouts", {
    ...body,
    userId: new mongoose.Types.ObjectId().toString(),
  }).expect(403);
  const stats = await agent.get(`/api/workouts/stats/${user._id}`).expect(200);
  assert.equal(stats.body.totalTrainingVolumeKg, 400);
  assert.equal(stats.body.totalSets, 1);
  const history = await agent.get(`/api/workouts/user/${user._id}`).expect(200);
  assert.equal(history.body.totalWorkouts, 1);
  await post(agent, "/api/workouts", {
    ...body,
    exercises: [{ name: "Empty", sets: [] }],
  }).expect(400);
  assert.equal(await Workout.countDocuments(), 1);
});

test("planner derives the owner, rejects impersonation and retains rule-based generation", async () => {
  const { agent, user } = await register();
  const body = {
    goal: "Muscle Gain",
    experienceLevel: "Beginner",
    workoutDaysPerWeek: 3,
  };
  const created = await post(agent, "/api/plans/generate", body).expect(201);
  assert.equal(created.body.plan.userId, user._id);
  assert.equal(created.body.plan.schedule.length, 7);
  assert.equal(
    created.body.plan.schedule.filter((day) => day.focus !== "Rest").length,
    3,
  );
  await post(agent, "/api/plans/generate", {
    ...body,
    userId: new mongoose.Types.ObjectId().toString(),
  }).expect(403);
  await post(agent, "/api/plans/generate", {
    ...body,
    workoutDaysPerWeek: 7,
  }).expect(400);
  const saved = await agent.get(`/api/plans/user/${user._id}`).expect(200);
  assert.equal(saved.body.totalPlans, 1);
  assert.equal(await WorkoutPlan.countDocuments(), 1);
});

test("challenge browsing, session-only joins, duplicates, progress and rankings remain functional", async () => {
  const { agent, user } = await register();
  const challenge = await Challenge.create({
    title: "Test challenge",
    description: "Isolated",
    targetWorkouts: 3,
    pointsPerWorkout: 10,
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000),
  });
  await agent.get("/api/challenges").expect(200);
  await post(agent, "/api/challenges", { title: "Forbidden" }).expect(403);
  await post(agent, `/api/challenges/${challenge.id}/join`, {
    userId: new mongoose.Types.ObjectId().toString(),
  }).expect(403);
  const joined = await post(
    agent,
    `/api/challenges/${challenge.id}/join`,
    {},
  ).expect(201);
  assert.equal(joined.body.entry.userId, user._id);
  await post(agent, `/api/challenges/${challenge.id}/join`, {}).expect(409);
  await post(agent, "/api/workouts", {
    workoutType: "Strength",
    durationMinutes: 20,
    exercises: [{ name: "Squats", sets: [{ reps: 10, weightKg: 20 }] }],
  }).expect(201);
  const board = await agent
    .get(`/api/challenges/${challenge.id}/leaderboard`)
    .expect(200);
  assert.equal(board.body.leaderboard[0].points, 10);
  assert.equal(board.body.leaderboard[0].completedWorkouts, 1);
  assert.equal(board.body.leaderboard[0].rank, 1);
  assert.equal(board.body.leaderboard[0].email, undefined);
  assert.equal(await ChallengeEntry.countDocuments(), 1);
  assert.equal(await Challenge.countDocuments(), 1);
});

test("profile updates only supported fields and legacy account routes are retired", async () => {
  const { agent, user } = await register();
  const result = await agent
    .patch("/api/users/me")
    .set("Origin", origin)
    .send({ name: "Alex Strong", workoutDaysPerWeek: 6 })
    .expect(200);
  assert.equal(result.body.user.name, "Alex Strong");
  assert.equal(result.body.user.passwordHash, undefined);
  for (const patch of [
    { passwordHash: "forged" },
    { _id: user._id },
    { role: "admin" },
    { email: "new@example.test" },
    { userId: user._id },
    { name: { $ne: null } },
  ]) {
    await agent
      .patch("/api/users/me")
      .set("Origin", origin)
      .send(patch)
      .expect(patch.name ? 400 : 403);
  }
  for (const method of ["get", "post"]) {
    let req = agent[method]("/api/users");
    if (method === "post") req = req.set("Origin", origin).send({});
    await req.expect(404);
  }
  for (const method of ["patch", "delete"])
    await agent[method](`/api/users/${user._id}`)
      .set("Origin", origin)
      .send({})
      .expect(404);
  assert.equal(await User.countDocuments(), 1);
});

test("session fixation is prevented by regenerating and invalidating the old session", async () => {
  const { result } = await register();
  const oldCookie = cookie(result);
  const login = await post(request(app), "/api/auth/login", {
    email: "alex@example.test",
    password,
  })
    .set("Cookie", oldCookie)
    .expect(200);
  assert.notEqual(cookie(login), oldCookie);
  await request(app).get("/api/auth/me").set("Cookie", oldCookie).expect(401);
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", cookie(login))
    .expect(200);
  assert.equal(
    await mongoose.connection.collection("sessions").countDocuments(),
    1,
  );
});

test("expired sessions are rejected server-side even with a replayed cookie", async () => {
  const { result } = await register();
  const sessions = mongoose.connection.collection("sessions");
  const saved = await sessions.findOne();
  const body = JSON.parse(saved.session);
  body.authExpiresAt = Date.now() - 1;
  await sessions.updateOne(
    { _id: saved._id },
    { $set: { session: JSON.stringify(body) } },
  );
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", cookie(result))
    .expect(401);
});

test("strict Origin checks protect registration, login, logout and authenticated mutations", async () => {
  const { agent } = await register();
  for (const path of [
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/workouts",
    "/api/plans/generate",
  ]) {
    for (const bad of [
      undefined,
      "null",
      "https://evil.example",
      `${origin}.evil.example`,
      `${origin}/path`,
    ]) {
      let req = agent.post(path);
      if (bad) req = req.set("Origin", bad);
      await req.send({}).expect(403);
    }
  }
  await agent.patch("/api/users/me").send({ name: "No origin" }).expect(403);
  await agent.get("/api/auth/me").expect(200);
  await agent
    .post("/api/auth/logout")
    .set("Origin", origin)
    .set("Sec-Fetch-Site", "cross-site")
    .send({})
    .expect(403);
  await agent
    .post("/api/auth/logout")
    .set("Origin", origin)
    .type("form")
    .send({})
    .expect(415);
  await request(app)
    .get("/api/auth/me")
    .set("Origin", "https://evil.example")
    .expect((res) =>
      assert.equal(res.headers["access-control-allow-origin"], undefined),
    );
});

test("repeated failed authentication attempts are rate limited", async () => {
  const limited = await createApp({
    config: harness.config,
    client: mongoose.connection.getClient(),
    authLimit: 2,
  });
  const body = { email: "missing@example.test", password };
  await post(request(limited), "/api/auth/login", body).expect(401);
  await post(request(limited), "/api/auth/login", body).expect(401);
  const result = await post(request(limited), "/api/auth/login", body).expect(
    429,
  );
  assert.match(result.body.message, /Too many/);
  assert(result.headers["retry-after"]);
});

test("production cookies use Secure, HttpOnly, SameSite and the __Host prefix behind trusted TLS proxy", async () => {
  const config = readConfig({
    NODE_ENV: "production",
    SESSION_SECRET: randomBytes(48).toString("base64"),
    TRUSTED_ORIGINS: "https://fitness.example",
    MONGO_DB_NAME: harness.config.dbName,
  });
  const production = await createApp({
    config,
    client: mongoose.connection.getClient(),
    authLimit: 500,
  });
  const result = await request(production)
    .post("/api/auth/register")
    .set("Origin", "https://fitness.example")
    .set("X-Forwarded-Proto", "https")
    .send(registration())
    .expect(201);
  const value = result.headers["set-cookie"][0];
  assert.match(value, /^__Host-olympian.sid=/);
  assert.match(value, /Secure/);
  assert.match(value, /HttpOnly/);
  assert.match(value, /SameSite=Lax/);
  assert.match(value, /Path=\//);
  assert(!value.includes("Domain="));
});

test("configuration fails closed for missing secrets or unsafe production origins", () => {
  assert.throws(() => readConfig({}), /SESSION_SECRET/);
  assert.throws(
    () => readConfig({ SESSION_SECRET: "short" }),
    /SESSION_SECRET/,
  );
  assert.throws(
    () =>
      readConfig({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(48) }),
    /TRUSTED_ORIGINS/,
  );
  assert.throws(
    () =>
      readConfig({
        NODE_ENV: "production",
        SESSION_SECRET: "x".repeat(48),
        TRUSTED_ORIGINS: origin,
      }),
    /HTTPS/,
  );
});

test("startup creates the required unique index without deleting legacy duplicate data", async () => {
  const { ensureUserIndex } = require("../utils/ensureUserIndex");
  const clean = mongoose.connection.collection("index_test_clean");
  await ensureUserIndex(clean);
  assert(
    (await clean.indexes()).some(
      (index) => index.unique && index.key.email === 1,
    ),
  );
  await clean.insertOne({ email: "unique@example.test" });
  await assert.rejects(
    clean.insertOne({ email: "unique@example.test" }),
    (error) => error.code === 11000,
  );
  const duplicates = mongoose.connection.collection("index_test_duplicates");
  await duplicates.insertMany([
    { email: "duplicate@example.test" },
    { email: "duplicate@example.test" },
  ]);
  await assert.rejects(ensureUserIndex(duplicates), /No accounts were changed/);
  assert.equal(await duplicates.countDocuments(), 2);
});
