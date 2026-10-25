
const mongoose = require("mongoose");

const plannedExerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sets: {
    type: Number,
    required: true,
    min: 1
  },
  reps: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const daySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true
  },
  focus: {
    type: String,
    required: true
  },
  exercises: {
    type: [plannedExerciseSchema],
    default: []
  }
}, { _id: false });

const workoutPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  goal: {
    type: String,
    enum: ["Muscle Gain", "Weight Loss", "General Fitness"],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: true
  },
  workoutDaysPerWeek: {
    type: Number,
    min: 3,
    max: 6,
    required: true
  },
  schedule: {
    type: [daySchema],
    required: true
  }
}, {
  timestamps: true,
  collection: "workout_plans"
});

module.exports = mongoose.model("WorkoutPlan", workoutPlanSchema);
