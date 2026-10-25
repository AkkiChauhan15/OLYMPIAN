const express = require("express");
const argon2 = require("argon2");
const { randomBytes } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const User = require("../models/User");
const { requireAuth } = require("../middleware/security");
const {
  normalizeEmail,
  emailQuery,
  validName,
  validEmail,
  validPassword,
  validPreferences,
  publicUser,
  isObject,
} = require("../utils/validation");

const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};
async function createLoginSession(req, userId, config) {
  await new Promise((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
  req.session.userId = String(userId);
  req.session.authExpiresAt = Date.now() + config.sessionMaxAge;
  await new Promise((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );
}
async function createAuthRouter(config, { authLimit = 10 } = {}) {
  const router = express.Router();
  // Use the same verification cost for missing, legacy and password-bearing accounts.
  const dummyHash = await argon2.hash(
    randomBytes(32).toString("base64"),
    passwordOptions,
  );
  const rateOptions = {
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      message:
        "Too many authentication attempts. Please try again in 15 minutes.",
    },
  };
  const limiter = rateLimit(rateOptions);
  const registrationLimiter = rateLimit({
    ...rateOptions,
    skipSuccessfulRequests: false,
  });
  router.post("/register", registrationLimiter, async (req, res) => {
    const body = req.body;
    const allowed = [
      "name",
      "email",
      "password",
      "fitnessGoal",
      "experienceLevel",
      "workoutDaysPerWeek",
    ];
    if (
      !isObject(body) ||
      Object.keys(body).some((key) => !allowed.includes(key)) ||
      !validName(body.name) ||
      !validEmail(body.email) ||
      !validPassword(body.password) ||
      !validPreferences(body)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Enter a name (2–100 characters), a valid email, a password of 15–128 characters, and valid training preferences.",
        });
    }
    if (await User.exists(emailQuery(body.email)))
      return res
        .status(409)
        .json({
          message:
            "An account with this email already exists. Sign in or use another email.",
        });
    const passwordHash = await argon2.hash(body.password, passwordOptions);
    let user;
    try {
      user = await User.create({
        name: body.name.trim(),
        email: normalizeEmail(body.email),
        passwordHash,
        fitnessGoal: body.fitnessGoal,
        experienceLevel: body.experienceLevel,
        workoutDaysPerWeek: body.workoutDaysPerWeek,
      });
    } catch (error) {
      if (error.code === 11000)
        return res
          .status(409)
          .json({
            message:
              "An account with this email already exists. Sign in or use another email.",
          });
      throw error;
    }
    await createLoginSession(req, user._id, config);
    res
      .status(201)
      .json({
        message: "Account created successfully",
        user: publicUser(user),
      });
  });
  router.post("/login", limiter, async (req, res) => {
    const body = req.body;
    if (
      !isObject(body) ||
      !validEmail(body.email) ||
      typeof body.password !== "string" ||
      !body.password.length ||
      body.password.length > 128 ||
      Object.keys(body).some((key) => !["email", "password"].includes(key))
    ) {
      return res
        .status(400)
        .json({ message: "Enter a valid email and password." });
    }
    const matches = await User.find(emailQuery(body.email))
      .limit(2)
      .select("+passwordHash");
    const user = matches.length === 1 ? matches[0] : null;
    let valid = false;
    try {
      valid = await argon2.verify(
        user?.passwordHash || dummyHash,
        body.password,
      );
    } catch {
      valid = false;
    }
    if (!user?.passwordHash || !valid)
      return res.status(401).json({ message: "Invalid email or password" });
    await createLoginSession(req, user._id, config);
    res.json({ message: "Logged in successfully", user: publicUser(user) });
  });
  router.get("/me", requireAuth, (req, res) =>
    res.json({ user: publicUser(req.user) }),
  );
  router.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(config.cookieName, config.cookie);
      res.json({ message: "Logged out successfully" });
    });
  });
  return router;
}
module.exports = { createAuthRouter, passwordOptions };
