const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { randomBytes } = require("node:crypto");
const { readConfig } = require("../config");
const { createApp } = require("../app");

async function isolatedApp() {
  // Never load .env or accept an Atlas URI in this harness.
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: "olympian_auth_test" },
  });
  const config = readConfig({
    NODE_ENV: "test",
    SESSION_SECRET: randomBytes(48).toString("base64"),
    MONGO_DB_NAME: "olympian_auth_test",
  });
  await mongoose.connect(mongo.getUri(), { dbName: config.dbName });
  const models = [
    "User",
    "Workout",
    "WorkoutPlan",
    "Challenge",
    "ChallengeEntry",
  ].map((name) => require(`../models/${name}`));
  await Promise.all(models.map((model) => model.init()));
  const app = await createApp({
    config,
    client: mongoose.connection.getClient(),
    authLimit: 500,
  });
  return {
    app,
    config,
    mongo,
    async close() {
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}
module.exports = { isolatedApp };
