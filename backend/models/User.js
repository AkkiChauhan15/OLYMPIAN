const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    passwordHash: {
      type: String,
      // Optional only for existing legacy accounts. Registration always hashes a password.
      required: false,
      select: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fitnessGoal: {
      type: String,
      default: "General Fitness",
    },
    experienceLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    workoutDaysPerWeek: {
      type: Number,
      min: 1,
      max: 7,
      default: 3,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, result) => {
        delete result.passwordHash;
        return result;
      },
    },
    toObject: {
      transform: (_doc, result) => {
        delete result.passwordHash;
        return result;
      },
    },
  },
);

module.exports = mongoose.model("User", userSchema);
