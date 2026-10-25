// These records exist only in the test harness. The application never loads them.
export async function mockApi(page, options = {}) {
  const now = new Date();
  const ago = (days) => new Date(now.getTime() - days * 86400000).toISOString();
  const ahead = (days) =>
    new Date(now.getTime() + days * 86400000).toISOString();
  const user = {
    _id: "athlete-one",
    name: "Alex Morgan",
    email: "alex@example.test",
    fitnessGoal: "Muscle Gain",
    experienceLevel: "Intermediate",
    workoutDaysPerWeek: 4,
    createdAt: ago(90),
    updatedAt: ago(2),
  };
  const secondUser = {
    ...user,
    _id: "athlete-two",
    name: "Jordan Lee",
    email: "jordan@example.test",
    fitnessGoal: "General Fitness",
  };
  const workout = {
    _id: "workout-one",
    userId: user._id,
    workoutType: "Push Day",
    durationMinutes: 45,
    date: ago(0),
    exercises: [
      {
        name: "Bench Press",
        sets: [
          { reps: 12, weightKg: 40 },
          { reps: 10, weightKg: 45 },
        ],
      },
    ],
  };
  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const plan = {
    _id: "plan-one",
    userId: user._id,
    goal: "Muscle Gain",
    experienceLevel: "Intermediate",
    workoutDaysPerWeek: 4,
    createdAt: ago(3),
    schedule: weekdays.map((day, i) => ({
      day,
      focus: i < 4 ? "Full Body" : "Rest",
      exercises: i < 4 ? [{ name: "Squats", sets: 3, reps: 10 }] : [],
    })),
  };
  const active = {
    _id: "challenge-active",
    title: "The Consistency Club",
    description: "Build a routine that stays with you. One workout at a time.",
    targetWorkouts: 12,
    pointsPerWorkout: 10,
    startDate: ago(10),
    endDate: ahead(20),
  };
  const challenges = [
    active,
    {
      ...active,
      _id: "challenge-upcoming",
      title: "The Next Chapter",
      startDate: ahead(4),
      endDate: ahead(30),
    },
    {
      ...active,
      _id: "challenge-ended",
      title: "Last Month’s Momentum",
      startDate: ago(40),
      endDate: ago(10),
    },
  ];
  const workouts = options.empty ? [] : [workout];
  const plans = options.empty ? [] : [plan];
  const requests = [];
  let joined = false;
  let failMe = !!options.failMe;
  let authenticated = options.authenticated !== false;
  let failStats = !!options.failStats;
  const participants = [
    {
      rank: 1,
      userId: "other-one",
      name: "Sam Rivera",
      points: 100,
      completedWorkouts: 10,
    },
    {
      rank: 2,
      userId: "other-two",
      name: "Jamie Chen",
      points: 80,
      completedWorkouts: 8,
    },
    {
      rank: 3,
      userId: "other-three",
      name: "Taylor Brooks",
      points: 60,
      completedWorkouts: 6,
    },
    {
      rank: 4,
      userId: "other-four",
      name: "Casey Park",
      points: 40,
      completedWorkouts: 4,
    },
  ];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postDataJSON();
    requests.push({ path, method, body });
    const respond = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (path === "/api/auth/me" && method === "GET") {
      if (failMe) return respond({ message: "Test backend unavailable" }, 503);
      return authenticated
        ? respond({ user })
        : respond({ message: "Please sign in to continue." }, 401);
    }
    if (path === "/api/auth/logout") {
      authenticated = false;
      return respond({ message: "Logged out successfully" });
    }
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      authenticated = true;
      return respond({ user }, path.endsWith("register") ? 201 : 200);
    }
    if (path === "/api/users/me" && method === "PATCH") {
      Object.assign(user, body, { updatedAt: new Date().toISOString() });
      return respond({ message: "User updated successfully", user });
    }
    if (!authenticated)
      return respond(
        { message: "Your session has expired. Please sign in again." },
        401,
      );
    if (path.startsWith("/api/workouts/stats/")) {
      if (options.delaySecond && path.endsWith(secondUser._id))
        await new Promise((r) => setTimeout(r, 650));
      if (failStats)
        return respond({ message: "Test statistics unavailable" }, 500);
      if (options.incompleteStats) return respond({ totalWorkouts: 0 });
      const records = path.endsWith(user._id) ? workouts : [];
      return respond({
        totalWorkouts: records.length,
        totalDurationMinutes: records.reduce(
          (n, w) => n + w.durationMinutes,
          0,
        ),
        totalSets: records.reduce(
          (n, w) => n + w.exercises.reduce((v, e) => v + e.sets.length, 0),
          0,
        ),
        totalTrainingVolumeKg: records.reduce(
          (n, w) =>
            n +
            w.exercises.reduce(
              (v, e) => v + e.sets.reduce((z, s) => z + s.reps * s.weightKg, 0),
              0,
            ),
          0,
        ),
      });
    }
    if (path.startsWith("/api/workouts/user/"))
      return respond({
        totalWorkouts: workouts.length,
        workouts: path.endsWith(user._id) ? workouts : [],
      });
    if (path === "/api/workouts" && method === "POST") {
      if (options.failSave)
        return respond({ message: "Test save failed. Please retry." }, 500);
      const saved = {
        ...body,
        _id: `workout-${workouts.length + 1}`,
        date: new Date().toISOString(),
      };
      workouts.unshift(saved);
      return respond(
        { message: "Workout saved successfully", workout: saved },
        201,
      );
    }
    if (path.startsWith("/api/plans/user/"))
      return respond({
        totalPlans: plans.length,
        plans: path.endsWith(user._id) ? plans : [],
      });
    if (path === "/api/plans/generate" && method === "POST") {
      const saved = {
        ...plan,
        ...body,
        _id: `plan-${plans.length + 1}`,
        createdAt: new Date().toISOString(),
      };
      plans.unshift(saved);
      return respond(
        { message: "Workout plan generated successfully", plan: saved },
        201,
      );
    }
    if (path === "/api/challenges")
      return respond(options.noChallenges ? [] : challenges);
    if (path.endsWith("/leaderboard"))
      return respond({
        challenge: active.title,
        leaderboard: options.emptyBoard
          ? []
          : [
              ...participants,
              ...(joined && !options.omitMembership
                ? [
                    {
                      rank: 5,
                      userId: user._id,
                      name: user.name,
                      completedWorkouts: 0,
                      points: 0,
                    },
                  ]
                : []),
            ],
      });
    if (path.endsWith("/join") && method === "POST") {
      joined = true;
      return options.duplicate
        ? respond({ message: "Already joined this challenge" }, 409)
        : respond(
            {
              message: "Challenge joined successfully",
              entry: {
                userId: user._id,
                challengeId: active._id,
                completedWorkouts: 0,
                points: 0,
              },
            },
            201,
          );
    }
    return respond(
      { message: `Unexpected test API call: ${method} ${path}` },
      404,
    );
  });
  return {
    requests,
    user,
    secondUser,
    workouts,
    plans,
    recoverMe: () => {
      failMe = false;
    },
    expireSession: () => {
      authenticated = false;
    },
    recoverStats: () => {
      failStats = false;
    },
  };
}
