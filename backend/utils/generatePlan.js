
const templates = {
  Push: [
    { name: "Push-ups", sets: 3, reps: 12 },
    { name: "Bench Press", sets: 3, reps: 10 }
  ],
  Pull: [
    { name: "Lat Pulldown", sets: 3, reps: 12 },
    { name: "Dumbbell Row", sets: 3, reps: 10 }
  ],
  Legs: [
    { name: "Squats", sets: 3, reps: 12 },
    { name: "Lunges", sets: 3, reps: 10 }
  ],
  "Full Body": [
    { name: "Squats", sets: 3, reps: 12 },
    { name: "Push-ups", sets: 3, reps: 12 },
    { name: "Dumbbell Row", sets: 3, reps: 10 }
  ]
};

const splits = {
  3: ["Full Body", "Full Body", "Full Body"],
  4: ["Push", "Pull", "Legs", "Full Body"],
  5: ["Push", "Pull", "Legs", "Push", "Pull"],
  6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"]
};

function generatePlan(goal, experienceLevel, days) {
  const count = Number(days);
  const split = splits[count];

  if (!split) {
    throw new Error("Workout days must be between 3 and 6");
  }

  const weekDays = [
    "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday"
  ];

  // Spread workouts across the week
  const positions = {
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5]
  };

  const schedule = weekDays.map(day => ({
    day,
    focus: "Rest",
    exercises: []
  }));

  positions[count].forEach((position, index) => {
    const focus = split[index];

    schedule[position] = {
      day: weekDays[position],
      focus,
      exercises: templates[focus].map(exercise => ({
        ...exercise,
        sets: experienceLevel === "Beginner"
          ? 2
          : exercise.sets,
        reps: goal === "Muscle Gain"
          ? 10
          : exercise.reps
      }))
    };
  });

  return schedule;
}

module.exports = generatePlan;
