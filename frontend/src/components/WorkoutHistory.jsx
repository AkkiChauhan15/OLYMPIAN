import { useState } from "react";
import { ChevronDown, Clock3, Dumbbell, Layers3 } from "lucide-react";
import { Badge } from "./ui";
import { formatDate, formatNumber, setsCount, volume } from "../utils/fitness";
export default function WorkoutHistory({ workouts, compact = false }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className={`workout-list ${compact ? "compact" : ""}`}>
      {workouts.map((workout) => (
        <article
          className={`workout-row ${expanded === workout._id ? "expanded" : ""}`}
          key={workout._id}
        >
          <button
            className="workout-row-button"
            onClick={() =>
              setExpanded(expanded === workout._id ? null : workout._id)
            }
            aria-expanded={expanded === workout._id}
            aria-controls={`workout-${workout._id}`}
          >
            <span className="workout-symbol">
              <Dumbbell size={20} />
            </span>
            <span className="workout-title">
              <strong>{workout.workoutType}</strong>
              <span>
                {formatDate(workout.date, { year: "numeric" })}
                <i>·</i>
                {workout.exercises.length} exercises
              </span>
            </span>
            <span className="workout-duration">
              <Clock3 size={13} />
              {workout.durationMinutes} min
            </span>
            <ChevronDown size={16} className="expand-chevron" />
          </button>
          {expanded === workout._id && (
            <div className="workout-details" id={`workout-${workout._id}`}>
              <div className="workout-detail-stats">
                <Badge color="neutral">
                  <Layers3 size={12} />
                  {setsCount(workout)} sets
                </Badge>
                <Badge color="violet">
                  {formatNumber(volume(workout))} kg volume
                </Badge>
              </div>
              {workout.exercises.map((e, i) => (
                <div className="history-exercise" key={i}>
                  <strong>{e.name}</strong>
                  <div>
                    {e.sets.map((s, j) => (
                      <span key={j}>
                        <small>{j + 1}</small>
                        {s.reps} reps × {s.weightKg} kg
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
