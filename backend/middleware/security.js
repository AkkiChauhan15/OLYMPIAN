const mongoose = require("mongoose");
const User = require("../models/User");

function originProtection(config) {
  return (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    // Require an explicit trusted browser Origin, even for login, registration and logout.
    const origin = req.get("Origin");
    if (
      !origin ||
      !config.origins.has(origin) ||
      req.get("Sec-Fetch-Site") === "cross-site"
    ) {
      return res
        .status(403)
        .json({
          message:
            "Request origin is not trusted. Reload OLYMPIAN and try again.",
        });
    }
    if (!req.is("application/json"))
      return res
        .status(415)
        .json({ message: "Use application/json for this request." });
    next();
  };
}
async function requireAuth(req, res, next) {
  try {
    const { userId, authExpiresAt } = req.session || {};
    if (
      !userId ||
      !mongoose.isValidObjectId(userId) ||
      !Number.isFinite(authExpiresAt) ||
      Date.now() >= authExpiresAt
    ) {
      if (userId)
        return req.session.destroy((error) =>
          error
            ? next(error)
            : res
                .status(401)
                .json({
                  message: "Your session has expired. Please sign in again.",
                }),
        );
      return res.status(401).json({ message: "Please sign in to continue." });
    }
    const user = await User.findById(userId);
    if (!user)
      return req.session.destroy((error) =>
        error
          ? next(error)
          : res.status(401).json({ message: "Please sign in again." }),
      );
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
function requireOwnUser(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.userId))
    return res.status(400).json({ message: "Invalid user ID" });
  if (String(req.user._id) !== req.params.userId)
    return res
      .status(403)
      .json({ message: "You can only access your own records." });
  next();
}
function rejectImpersonation(req, res, next) {
  if (
    req.body?.userId !== undefined &&
    req.body.userId !== String(req.user._id)
  ) {
    return res
      .status(403)
      .json({ message: "You can only act as your own account." });
  }
  next();
}
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed")
    return res.status(400).json({ message: "Invalid JSON request." });
  if (error.type === "entity.too.large")
    return res.status(413).json({ message: "The request is too large." });
  if (error.name === "ValidationError" || error.name === "CastError")
    return res
      .status(400)
      .json({ message: "Invalid input. Check the values and try again." });
  if (error.code === 11000)
    return res.status(409).json({ message: "This record already exists." });
  // Never log request bodies, cookies, database connection strings or exception messages.
  console.error("OLYMPIAN request failed", { type: error.name || "Error" });
  res
    .status(500)
    .json({ message: "Unable to complete the request. Please try again." });
}
module.exports = {
  originProtection,
  requireAuth,
  requireOwnUser,
  rejectImpersonation,
  errorHandler,
};
