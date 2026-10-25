import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  History,
  LoaderCircle,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { goals, levels, formatDate } from "../utils/fitness";
import WeeklySchedule from "../components/WeeklySchedule";
import {
  Badge,
  Empty,
  PageHeading,
  Panel,
  PanelHeading,
  Resource,
} from "../components/ui";

const goalCopy = [
  "Build strength & size",
  "Move more, build momentum",
  "Feel better. Move better.",
];
const goalIcons = [Dumbbell, HeartPulse, Target];
export default function Planner() {
  const { user } = useApp();
  return <PlannerContent key={user?._id || "none"} />;
}
function PlannerContent() {
  const { user, plans, refresh } = useApp();
  const notify = useToast();
  const [goal, setGoal] = useState(
    goals.includes(user?.fitnessGoal) ? user.fitnessGoal : "General Fitness",
  );
  const [level, setLevel] = useState(user?.experienceLevel || "Beginner");
  const [days, setDays] = useState(
    Math.min(6, Math.max(3, user?.workoutDaysPerWeek || 3)),
  );
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);
  const allPlans = generated
    ? [generated, ...(plans.data || []).filter((p) => p._id !== generated._id)]
    : plans.data || [];
  const plan = allPlans.find((p) => p._id === selectedId) || allPlans[0];
  async function generate(event) {
    event.preventDefault();
    if (!user || busy) return;
    if (
      !goals.includes(goal) ||
      !levels.includes(level) ||
      ![3, 4, 5, 6].includes(days)
    ) {
      setError("Choose a goal, experience level, and 3–6 training days.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.generatePlan({
        goal,
        experienceLevel: level,
        workoutDaysPerWeek: days,
      });
      if (!result.plan?.schedule)
        throw new Error(
          "The generated plan could not be read. Refresh your saved plans before trying again.",
        );
      setGenerated(result.plan);
      setSelectedId(result.plan._id);
      refresh();
      notify("Your plan is ready. Let’s build some momentum.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE STRUCTURE. A LOT OF POTENTIAL."
        title="Your goals. Your game plan."
        description="Build a routine around who you are and where you want to go."
      >
        <Badge color="violet">
          <WandSparkles size={13} />
          SMART WORKOUT PLANNER
        </Badge>
      </PageHeading>
      <div className="planner-intro">
        <div className="planner-intro-icon">
          <CalendarDays size={29} strokeWidth={1.5} />
        </div>
        <div>
          <h2>Make a plan. Make it happen.</h2>
          <p>Three simple choices. One clear path for the week ahead.</p>
        </div>
        <span className="planner-intro-mark" aria-hidden="true">
          PLAN / PERFORM / PROGRESS
        </span>
      </div>
      <Panel className="planner-config">
        <form onSubmit={generate}>
          <fieldset disabled={busy}>
            <div className="planner-step">
              <div className="step-heading">
                <span>01</span>
                <div>
                  <h2>What are you working toward?</h2>
                  <p>Choose your primary fitness goal.</p>
                </div>
              </div>
              <div
                className="goal-options"
                role="group"
                aria-label="Fitness goal"
              >
                {goals.map((g, i) => {
                  const Icon = goalIcons[i];
                  return (
                    <button
                      type="button"
                      key={g}
                      className={`goal-option ${goal === g ? "selected" : ""}`}
                      aria-pressed={goal === g}
                      onClick={() => setGoal(g)}
                    >
                      <span className="option-icon">
                        <Icon size={24} strokeWidth={1.5} />
                      </span>
                      <strong>{g}</strong>
                      <span>{goalCopy[i]}</span>
                      <span className="option-check">
                        {goal === g && <Check size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="planner-second-row">
              <div className="planner-step">
                <div className="step-heading">
                  <span>02</span>
                  <div>
                    <h2>Where are you starting?</h2>
                    <p>Pick your experience level.</p>
                  </div>
                </div>
                <div
                  className="segmented"
                  role="group"
                  aria-label="Experience level"
                >
                  {levels.map((l) => (
                    <button
                      type="button"
                      key={l}
                      aria-pressed={level === l}
                      className={level === l ? "selected" : ""}
                      onClick={() => setLevel(l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="planner-step">
                <div className="step-heading">
                  <span>03</span>
                  <div>
                    <h2>Find your rhythm.</h2>
                    <p>How many days can you commit?</p>
                  </div>
                </div>
                <div
                  className="frequency-options"
                  role="group"
                  aria-label="Workout frequency"
                >
                  {[3, 4, 5, 6].map((d) => (
                    <button
                      type="button"
                      key={d}
                      aria-pressed={days === d}
                      className={days === d ? "selected" : ""}
                      onClick={() => setDays(d)}
                    >
                      <strong>{d}</strong>
                      <span>days / week</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="planner-config-footer">
              <p>
                <Sparkles size={16} />A structured routine, generated from
                training rules.
              </p>
              <button
                className="button primary"
                type="submit"
                disabled={!user || busy}
              >
                {busy ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <WandSparkles size={17} />
                )}
                {busy ? "Building your plan…" : "Generate my workout plan"}
                <ChevronRight size={16} />
              </button>
            </div>
          </fieldset>
        </form>
      </Panel>
      <Panel className="planner-result">
        <PanelHeading
          title="A week with purpose"
          subtitle={
            plan
              ? `${plan.goal} · ${plan.experienceLevel} · ${plan.workoutDaysPerWeek} training days`
              : "Your saved weekly training schedule"
          }
        >
          {plan && <Badge color="lime">SAVED PLAN</Badge>}
        </PanelHeading>
        {!user ? (
          <Empty
            icon={CalendarDays}
            title="Your plan starts with you"
            description="Choose your preferences and generate your first routine."
          />
        ) : generated ? (
          <WeeklySchedule key={plan?._id} plan={plan} />
        ) : (
          <Resource resource={plans}>
            {() => <WeeklySchedule key={plan?._id} plan={plan} />}
          </Resource>
        )}
      </Panel>
      <Panel>
        <PanelHeading
          title="Your plan library"
          subtitle="Revisit a routine whenever you need it."
        />
        {!user ? (
          <Empty
            compact
            icon={History}
            title="A space for your routines"
            description="Saved plans will appear here once you save a plan."
          />
        ) : (
          <Resource resource={plans}>
            {() =>
              allPlans.length ? (
                <div className="plan-library">
                  {allPlans.map((p) => (
                    <button
                      className={`saved-plan ${plan?._id === p._id ? "selected" : ""}`}
                      key={p._id}
                      onClick={() => setSelectedId(p._id)}
                      aria-pressed={plan?._id === p._id}
                    >
                      <span className="saved-plan-icon">
                        <CalendarDays size={22} />
                      </span>
                      <span>
                        <strong>{p.goal}</strong>
                        <span>
                          {p.experienceLevel} · {p.workoutDaysPerWeek} days /
                          week
                        </span>
                        <small>
                          Created {formatDate(p.createdAt, { year: "numeric" })}
                        </small>
                      </span>
                      {plan?._id === p._id ? (
                        <Check size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <Empty
                  compact
                  icon={History}
                  title="Your next routine starts above"
                  description="Generate your first plan to begin your library."
                />
              )
            }
          </Resource>
        )}
      </Panel>
    </>
  );
}
