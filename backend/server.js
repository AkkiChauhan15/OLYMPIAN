require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const { readConfig } = require("./config");
const { createApp } = require("./app");
const { ensureUserIndex } = require("./utils/ensureUserIndex");

async function startServer() {
  const config = readConfig();
  if (!config.mongoUri) throw new Error("MONGO_URI is required.");
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
    throw new Error("PORT must be a valid port number.");
  await mongoose.connect(config.mongoUri, {
    dbName: config.dbName,
    autoIndex: false,
  });
  await ensureUserIndex(mongoose.connection.collection("users"));
  const app = await createApp({
    config,
    client: mongoose.connection.getClient(),
  });
  const server = app.listen(config.port, config.host, () =>
    console.log(`OLYMPIAN API listening on port ${config.port}`),
  );
  const close = () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  return { app, server };
}
if (require.main === module)
  startServer().catch(async (error) => {
    const safe =
      /^(SESSION_SECRET|TRUSTED_ORIGINS|Trusted origins|SESSION_MAX_AGE_HOURS|MONGO_URI is required|PORT must|A unique users.email index)/.test(
        error.message,
      );
    console.error(
      safe
        ? error.message
        : "OLYMPIAN startup failed. Check the database connection and configuration.",
    );
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
module.exports = { startServer };
