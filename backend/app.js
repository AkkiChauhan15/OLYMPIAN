const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const User = require("./models/User");
const { createAuthRouter } = require("./routes/auth");
const {
  requireAuth,
  originProtection,
  errorHandler,
} = require("./middleware/security");
const {
  validName,
  validPreferences,
  publicUser,
  isObject,
} = require("./utils/validation");

async function createApp({ config, client, authLimit } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (config.production) app.set("trust proxy", "loopback");
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !!origin && config.origins.has(origin));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  );
  app.use("/api", originProtection(config));
  app.use(express.json({ limit: "64kb" }));
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !isObject(req.body))
      return res
        .status(400)
        .json({ message: "Use a JSON object for this request." });
    next();
  });
  const sessionStore = MongoStore.create({
    client,
    dbName: config.dbName,
    collectionName: "sessions",
    ttl: config.sessionMaxAge / 1000,
    touchAfter: 60,
  });
  sessionStore.on("error", () => console.error("OLYMPIAN session store error"));
  app.locals.sessionStore = sessionStore;
  app.use(
    session({
      name: config.cookieName,
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: { ...config.cookie, maxAge: config.sessionMaxAge },
    }),
  );
  app.get("/", (_req, res) => res.json({ message: "Welcome to OLYMPIAN API" }));
  app.use("/api/auth", await createAuthRouter(config, { authLimit }));
  app.use("/api", requireAuth);
  app.patch("/api/users/me", async (req, res) => {
    const body = req.body;
    const allowed = [
      "name",
      "fitnessGoal",
      "experienceLevel",
      "workoutDaysPerWeek",
    ];
    if (Object.keys(body).some((key) => !allowed.includes(key)))
      return res
        .status(403)
        .json({
          message:
            "Only your name and training preferences can be changed here.",
        });
    if (
      !Object.keys(body).length ||
      (body.name !== undefined && !validName(body.name)) ||
      !validPreferences(body, req.user)
    )
      return res
        .status(400)
        .json({
          message:
            "Enter a name of 2–100 characters and valid training preferences.",
        });
    const updates = Object.fromEntries(
      allowed
        .filter((key) => body[key] !== undefined)
        .map((key) => [key, key === "name" ? body[key].trim() : body[key]]),
    );
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { returnDocument: "after", runValidators: true },
    );
    res.json({ message: "User updated successfully", user: publicUser(user) });
  });
  app.use("/api", require("./routes/fitness"));
  app.use((_req, res) =>
    res.status(404).json({ message: "Endpoint not found" }),
  );
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
