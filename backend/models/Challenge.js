
const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  targetWorkouts: {
    type: Number,
    required: true,
    min: 1
  },
  pointsPerWorkout: {
    type: Number,
    default: 10,
    min: 0
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: "End date must be after start date"
    }
  }
}, {
  timestamps: true,
  collection: "challenges"
});

module.exports = mongoose.model("Challenge", challengeSchema);
