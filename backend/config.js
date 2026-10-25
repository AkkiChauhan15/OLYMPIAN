function readConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  if (!env.SESSION_SECRET || env.SESSION_SECRET.trim().length < 32) {
    throw new Error(
      "SESSION_SECRET must contain at least 32 characters. Generate a random secret before starting the server.",
    );
  }
  const rawOrigins =
    env.TRUSTED_ORIGINS ||
    (production ? "" : "http://localhost:5173,http://127.0.0.1:5173");
  const origins = rawOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!origins.length)
    throw new Error("TRUSTED_ORIGINS is required in production.");
  for (const origin of origins) {
    let url;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("TRUSTED_ORIGINS must contain valid origins.");
    }
    if (
      url.origin !== origin ||
      !["http:", "https:"].includes(url.protocol) ||
      (production && url.protocol !== "https:")
    ) {
      throw new Error(
        "Trusted origins must be exact origins without paths; production requires HTTPS.",
      );
    }
  }
  const hours = Number(env.SESSION_MAX_AGE_HOURS || 24);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168)
    throw new Error("SESSION_MAX_AGE_HOURS must be between 1 and 168.");
  return {
    production,
    origins: new Set(origins),
    sessionSecret: env.SESSION_SECRET,
    sessionMaxAge: hours * 60 * 60 * 1000,
    cookieName: production ? "__Host-olympian.sid" : "olympian.sid",
    cookie: { httpOnly: true, secure: production, sameSite: "lax", path: "/" },
    mongoUri: env.MONGO_URI,
    dbName: env.MONGO_DB_NAME || "olympian",
    host: env.HOST || "127.0.0.1",
    port: Number(env.PORT || 5000),
  };
}
module.exports = { readConfig };
