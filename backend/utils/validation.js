const goals = ["Muscle Gain", "Weight Loss", "General Fitness"];
const levels = ["Beginner", "Intermediate", "Advanced"];
const normalizeEmail = (email) => email.trim().toLowerCase();
const validEmail = (email) =>
  typeof email === "string" &&
  email.trim().length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const validName = (name) =>
  typeof name === "string" &&
  name.trim().length >= 2 &&
  name.trim().length <= 100;
const validPassword = (password) =>
  typeof password === "string" &&
  password.length >= 15 &&
  password.length <= 128;
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const validDays = (days, min = 1, max = 7) =>
  typeof days === "number" &&
  Number.isInteger(days) &&
  days >= min &&
  days <= max;
function validPreferences(body, current = {}) {
  return (
    (body.fitnessGoal === undefined ||
      (typeof body.fitnessGoal === "string" &&
        (goals.includes(body.fitnessGoal) ||
          body.fitnessGoal === current.fitnessGoal))) &&
    (body.experienceLevel === undefined ||
      levels.includes(body.experienceLevel)) &&
    (body.workoutDaysPerWeek === undefined ||
      validDays(body.workoutDaysPerWeek))
  );
}
// Match legacy addresses with whitespace/case differences without rewriting or claiming them.
const emailQuery = (email) => ({
  $expr: {
    $eq: [
      { $toLower: { $trim: { input: { $ifNull: ["$email", ""] } } } },
      normalizeEmail(email),
    ],
  },
});
function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    fitnessGoal: user.fitnessGoal,
    experienceLevel: user.experienceLevel,
    workoutDaysPerWeek: user.workoutDaysPerWeek,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
module.exports = {
  goals,
  levels,
  normalizeEmail,
  validEmail,
  validName,
  validPassword,
  isObject,
  validDays,
  validPreferences,
  emailQuery,
  publicUser,
};
