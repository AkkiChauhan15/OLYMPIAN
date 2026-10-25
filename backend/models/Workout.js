
const mongoose = require("mongoose");

const setSchema = new mongoose.Schema({
  reps: {
    type: Number,
    min: 0,
    required: true
  },
  weightKg: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sets: {
    type: [setSchema],
    required: true
  }
}, { _id: false });

const workoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  workoutType: {
    type: String,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  exercises: {
    type: [exerciseSchema],
    required: true,
    validate: {
      validator: arr => arr.length > 0,
      message: "At least one exercise is required"
    }
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: "workout_logs"
});

workoutSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model("Workout", workoutSchema);
