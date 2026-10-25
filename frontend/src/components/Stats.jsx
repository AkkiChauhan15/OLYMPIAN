import { Dumbbell, Clock3, Layers3, Weight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatNumber } from "../utils/fitness";
import { ErrorState, Skeleton } from "./ui";
const metrics = [
  {
    key: "totalWorkouts",
    title: "Total workouts",
    unit: "sessions",
    icon: Dumbbell,
    color: "lime",
    note: "Every session counts",
  },
  {
    key: "totalDurationMinutes",
    title: "Training time",
    unit: "min",
    icon: Clock3,
    color: "violet",
    note: "Time invested in you",
  },
  {
    key: "totalSets",
    title: "Sets completed",
    unit: "sets",
    icon: Layers3,
    color: "blue",
    note: "One rep at a time",
  },
  {
    key: "totalTrainingVolumeKg",
    title: "Training volume",
    unit: "kg",
    icon: Weight,
    color: "orange",
    note: "Total weight × repetitions",
  },
];
export default function Stats() {
  const { stats, user } = useApp();
  if (stats.error)
    return <ErrorState error={stats.error} onRetry={stats.reload} compact />;
  return (
    <div className="stats-grid">
      {metrics.map(({ key, title, unit, icon: Icon, color, note }) => (
        <section className="stat-card" key={key}>
          <div className="stat-top">
            <span>{title}</span>
            <span className={`stat-icon ${color}`}>
              <Icon size={18} strokeWidth={1.7} />
            </span>
          </div>
          {stats.loading ? (
            <Skeleton lines={1} />
          ) : (
            <div className="stat-number">
              {user && stats.data ? formatNumber(stats.data[key]) : "—"}
              <span>{unit}</span>
            </div>
          )}
          <p>
            <span className={`tiny-dot ${color}`} />
            {note}
          </p>
        </section>
      ))}
    </div>
  );
}
