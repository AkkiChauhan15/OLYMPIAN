const { isolatedApp } = require("./helpers");
const Challenge = require("../models/Challenge");

async function main() {
  const harness = await isolatedApp();
  await Challenge.create({
    title: "Consistency test challenge",
    description: "Isolated browser test challenge",
    targetWorkouts: 5,
    pointsPerWorkout: 10,
    startDate: new Date(Date.now() - 86400000),
    endDate: new Date(Date.now() + 86400000),
  });
  const server = harness.app.listen(5001, "127.0.0.1", () =>
    console.log("Isolated OLYMPIAN test API ready on 5001"),
  );
  const close = () =>
    server.close(async () => {
      await harness.close();
      process.exit(0);
    });
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
main().catch(() => {
  console.error("Isolated test API failed to start");
  process.exit(1);
});
