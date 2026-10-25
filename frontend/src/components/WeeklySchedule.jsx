import { useState } from "react";
import { CalendarDays, ChevronDown, Coffee, Dumbbell } from "lucide-react";
import { weekdays } from "../utils/fitness";
import { Empty, Badge } from "./ui";

export default function WeeklySchedule({ plan, compact = false }) {
  const today = weekdays[(new Date().getDay() + 6) % 7];
  const [selected, setSelected] = useState(today);
  if (!plan)
    return (
      <Empty
        compact={compact}
        icon={CalendarDays}
        title="A good week starts with a plan"
        description="Choose your goal and build a weekly routine that works for you."
        to="/planner"
        action="Build my plan"
      />
    );
  const day = plan.schedule.find((d) => d.day === selected);
  return (
    <div className={`weekly-schedule ${compact ? "schedule-compact" : ""}`}>
      <div className="week-grid">
        {weekdays.map((name) => {
          const item = plan.schedule.find((d) => d.day === name);
          const rest = item?.focus === "Rest";
          return (
            <button
              className={`day-card ${selected === name ? "selected" : ""} ${rest ? "rest" : ""}`}
              key={name}
              onClick={() => setSelected(name)}
              aria-pressed={selected === name}
              aria-label={`${name}, ${item?.focus || "No schedule"}`}
            >
              <span className="day-name">
                {name.slice(0, 3)}
                {today === name && <span className="today-dot" />}
              </span>
              <span className="day-icon">
                {rest ? (
                  <Coffee size={19} strokeWidth={1.5} />
                ) : (
                  <Dumbbell size={19} strokeWidth={1.5} />
                )}
              </span>
              <strong>{item?.focus || "Unscheduled"}</strong>
              <span className="day-detail">
                {rest ? "Recharge" : `${item?.exercises.length || 0} exercises`}
              </span>
              <ChevronDown size={13} className="day-chevron" />
            </button>
          );
        })}
      </div>
      {day && (
        <div className="day-exercises" key={day.day}>
          <div className="day-exercises-heading">
            <h3>
              {day.day} <span> / {day.focus}</span>
            </h3>
            <Badge color={day.focus === "Rest" ? "neutral" : "violet"}>
              {day.focus === "Rest" ? "RECOVERY" : "TRAINING DAY"}
            </Badge>
          </div>
          {day.focus === "Rest" ? (
            <p className="rest-message">
              Take a breath. Recovery is part of getting stronger.
            </p>
          ) : (
            <div className="exercise-preview">
              {day.exercises.map((e, i) => (
                <div key={`${e.name}-${i}`}>
                  <span className="exercise-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <strong>{e.name}</strong>
                  <span>
                    {e.sets} sets <i>×</i> {e.reps} reps
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
