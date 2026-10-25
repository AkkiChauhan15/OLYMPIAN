
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const ChallengeEntry = require("../models/ChallengeEntry");
const Workout = require("../models/Workout");

async function updateChallengeProgress(userId) {
  const entries = await ChallengeEntry.find({ userId });

  const results = [];

  for (const entry of entries) {
    const challenge = await Challenge.findById(entry.challengeId);

    if (!challenge) continue;

    // Count only workouts completed after joining,
    // inside the challenge period.
    const from = new Date(
      Math.max(
        challenge.startDate.getTime(),
        entry.joinedAt.getTime()
      )
    );

    const qualifyingWorkouts = await Workout.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: {
        $gte: from,
        $lte: challenge.endDate
      }
    });

    const completedWorkouts = Math.min(
      qualifyingWorkouts,
      challenge.targetWorkouts
    );

    const points =
      completedWorkouts * challenge.pointsPerWorkout;

    await ChallengeEntry.updateOne(
      { _id: entry._id },
      {
        $set: {
          completedWorkouts,
          points
        }
      }
    );

    results.push({
      challengeId: challenge._id,
      completedWorkouts,
      points
    });
  }

  return results;
}

module.exports = updateChallengeProgress;
