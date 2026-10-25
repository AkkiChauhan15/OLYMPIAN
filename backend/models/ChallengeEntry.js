
const mongoose = require("mongoose");

const challengeEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Challenge",
    required: true
  },
  completedWorkouts: {
    type: Number,
    default: 0,
    min: 0
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: "challenge_entries"
});

// One entry per user for each challenge
challengeEntrySchema.index(
  { userId: 1, challengeId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ChallengeEntry",
  challengeEntrySchema
);
