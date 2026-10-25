const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Workout = require("../models/Workout");
const WorkoutPlan = require("../models/WorkoutPlan");
const Challenge = require("../models/Challenge");
const ChallengeEntry = require("../models/ChallengeEntry");
const generatePlan = require("../utils/generatePlan");
const updateChallengeProgress = require("../services/challengeProgress");
const {
  requireOwnUser,
  rejectImpersonation,
} = require("../middleware/security");
const { isObject } = require("../utils/validation");
const router = express.Router();
function validateWorkout(req, res, next) {
  const b = req.body;
  const number = (n) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (
    !isObject(b) ||
    typeof b.workoutType !== "string" ||
    !b.workoutType.trim() ||
    b.workoutType.length > 100 ||
    !number(b.durationMinutes) ||
    b.durationMinutes < 1 ||
    b.durationMinutes > 1440 ||
    !Array.isArray(b.exercises) ||
    !b.exercises.length ||
    b.exercises.length > 100 ||
    b.exercises.some(
      (e) =>
        !isObject(e) ||
        typeof e.name !== "string" ||
        !e.name.trim() ||
        e.name.length > 120 ||
        !Array.isArray(e.sets) ||
        !e.sets.length ||
        e.sets.length > 100 ||
        e.sets.some(
          (s) =>
            !isObject(s) ||
            !number(s.reps) ||
            !Number.isInteger(s.reps) ||
            !number(s.weightKg),
        ),
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          "Enter a workout type, a duration of 1–1440 minutes, and named exercises with valid sets.",
      });
  }
  next();
}
router.post(
  "/workouts",
  rejectImpersonation,
  validateWorkout,
  async (req, res) => {
    try {
      const { workoutType, durationMinutes, exercises } = req.body;
      const userId = req.user._id;

      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const workout = await Workout.create({
        userId,
        workoutType,
        durationMinutes,
        exercises,
      });

      try {
        await updateChallengeProgress(userId);
      } catch (error) {
        console.error(
          "Challenge progress update failed; reconciliation is required.",
        );
      }

      res.status(201).json({
        message: "Workout saved successfully",
        workout,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
        });
      }

      console.error("OLYMPIAN fitness request failed");
      res.status(500).json({
        message: "Failed to save workout",
      });
    }
  },
);

router.get("/workouts/user/:userId", requireOwnUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const workouts = await Workout.find({ userId }).sort({ date: -1 });

    res.status(200).json({
      totalWorkouts: workouts.length,
      workouts,
    });
  } catch (error) {
    console.error("OLYMPIAN fitness request failed");

    res.status(500).json({
      message: "Failed to fetch workouts",
    });
  }
});

router.get("/workouts/stats/:userId", requireOwnUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const stats = await Workout.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $project: {
          durationMinutes: 1,
          totalSets: {
            $reduce: {
              input: "$exercises",
              initialValue: 0,
              in: {
                $add: ["$$value", { $size: "$$this.sets" }],
              },
            },
          },
          trainingVolume: {
            $sum: {
              $map: {
                input: "$exercises",
                as: "exercise",
                in: {
                  $sum: {
                    $map: {
                      input: "$$exercise.sets",
                      as: "set",
                      in: {
                        $multiply: ["$$set.reps", "$$set.weightKg"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          totalDurationMinutes: {
            $sum: "$durationMinutes",
          },
          totalSets: { $sum: "$totalSets" },
          totalTrainingVolumeKg: {
            $sum: "$trainingVolume",
          },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalWorkouts: 0,
        totalDurationMinutes: 0,
        totalSets: 0,
        totalTrainingVolumeKg: 0,
      },
    );
  } catch (error) {
    console.error("OLYMPIAN fitness request failed");

    res.status(500).json({
      message: "Failed to calculate workout statistics",
    });
  }
});

router.post("/plans/generate", rejectImpersonation, async (req, res) => {
  try {
    const { goal, experienceLevel, workoutDaysPerWeek } = req.body;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const days = Number(workoutDaysPerWeek);

    if (!Number.isInteger(days) || days < 3 || days > 6) {
      return res.status(400).json({
        message: "Workout days must be 3 to 6",
      });
    }

    const allowedGoals = ["Muscle Gain", "Weight Loss", "General Fitness"];

    const allowedLevels = ["Beginner", "Intermediate", "Advanced"];

    if (
      !allowedGoals.includes(goal) ||
      !allowedLevels.includes(experienceLevel)
    ) {
      return res.status(400).json({
        message: "Invalid goal or experience level",
      });
    }

    const schedule = generatePlan(goal, experienceLevel, days);

    const plan = await WorkoutPlan.create({
      userId,
      goal,
      experienceLevel,
      workoutDaysPerWeek: days,
      schedule,
    });

    res.status(201).json({
      message: "Workout plan generated successfully",
      plan,
    });
  } catch (error) {
    console.error("OLYMPIAN fitness request failed");

    res.status(500).json({
      message: "Failed to generate workout plan",
    });
  }
});

router.get("/plans/user/:userId", requireOwnUser, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const plans = await WorkoutPlan.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      totalPlans: plans.length,
      plans,
    });
  } catch (error) {
    console.error("OLYMPIAN fitness request failed");

    res.status(500).json({
      message: "Failed to fetch workout plans",
    });
  }
});

router.post("/challenges", (_req, res) =>
  res
    .status(403)
    .json({
      message: "Challenge creation is not available for user accounts.",
    }),
);

router.get("/challenges", async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ startDate: -1 });

    res.json(challenges);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch challenges",
    });
  }
});

router.post("/challenges/:id/join", rejectImpersonation, async (req, res) => {
  try {
    const userId = req.user._id;

    if (
      !mongoose.isValidObjectId(userId) ||
      !mongoose.isValidObjectId(req.params.id)
    ) {
      return res.status(400).json({
        message: "Invalid ID",
      });
    }

    const [user, challenge] = await Promise.all([
      User.findById(userId),
      Challenge.findById(req.params.id),
    ]);

    if (!user || !challenge) {
      return res.status(404).json({
        message: "User or challenge not found",
      });
    }

    const now = new Date();

    if (now < challenge.startDate || now > challenge.endDate) {
      return res.status(400).json({
        message: "Challenge is not currently active",
      });
    }

    const entry = await ChallengeEntry.create({
      userId,
      challengeId: challenge._id,
    });

    res.status(201).json({
      message: "Challenge joined successfully",
      entry,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Already joined this challenge",
      });
    }

    console.error("OLYMPIAN fitness request failed");
    res.status(500).json({
      message: "Failed to join challenge",
    });
  }
});

router.get("/challenges/:id/leaderboard", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid challenge ID",
      });
    }

    const challenge = await Challenge.findById(id);

    if (!challenge) {
      return res.status(404).json({
        message: "Challenge not found",
      });
    }

    const leaderboard = await ChallengeEntry.aggregate([
      {
        $match: {
          challengeId: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $sort: {
          points: -1,
          completedWorkouts: -1,
          joinedAt: 1,
        },
      },
      {
        $project: {
          _id: 0,
          userId: 1,
          name: "$user.name",
          completedWorkouts: 1,
          points: 1,
        },
      },
      {
        $limit: 20,
      },
    ]);

    res.json({
      challenge: challenge.title,
      leaderboard: leaderboard.map((user, index) => ({
        rank: index + 1,
        ...user,
      })),
    });
  } catch (error) {
    console.error("OLYMPIAN fitness request failed");

    res.status(500).json({
      message: "Failed to retrieve leaderboard",
    });
  }
});

module.exports = router;
