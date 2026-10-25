export const goals = ["Muscle Gain", "Weight Loss", "General Fitness"];
export const levels = ["Beginner", "Intermediate", "Advanced"];
export const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const formatNumber = (n) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n ?? 0);
export const formatDate = (date, options = {}) =>
  date && !Number.isNaN(new Date(date).getTime())
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        ...options,
      }).format(new Date(date))
    : "Date unavailable";
export const initials = (name) =>
  (name || "Athlete")
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
export function challengeStatus(challenge) {
  const now = Date.now();
  if (now < new Date(challenge.startDate).getTime()) return "Upcoming";
  if (now > new Date(challenge.endDate).getTime()) return "Completed";
  return "Active";
}
export const setsCount = (workout) =>
  workout.exercises?.reduce((n, e) => n + (e.sets?.length || 0), 0) || 0;
export const volume = (workout) =>
  workout.exercises?.reduce(
    (n, e) => n + e.sets.reduce((v, s) => v + s.reps * s.weightKg, 0),
    0,
  ) || 0;
export function weekStart(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}
export function weeklyActivity(workouts, weeks = 1) {
  const start = weekStart();
  start.setDate(start.getDate() - 7 * (weeks - 1));
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const end = new Date(day);
    end.setDate(day.getDate() + 1);
    const items = workouts.filter(
      (w) => new Date(w.date) >= day && new Date(w.date) < end,
    );
    return {
      label: weeks === 1 ? weekdays[i].slice(0, 3) : formatDate(day),
      minutes: items.reduce((n, w) => n + w.durationMinutes, 0),
      workouts: items.length,
      date: day,
    };
  });
}
