import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Dumbbell,
  Flame,
  Plus,
  Target,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import Stats from "../components/Stats";
import ActivityChart from "../components/ActivityChart";
import WeeklySchedule from "../components/WeeklySchedule";
import WorkoutHistory from "../components/WorkoutHistory";
import ChallengeCard from "../components/ChallengeCard";
import {
  Badge,
  Empty,
  PageHeading,
  Panel,
  PanelHeading,
  Resource,
} from "../components/ui";
import { challengeStatus, weekStart } from "../utils/fitness";

export default function Dashboard() {
  const { user, workouts, plans, challenges } = useApp();
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const weekCount = workouts.data?.filter(
    (w) => new Date(w.date) >= weekStart() && new Date(w.date) <= new Date(),
  ).length;
  const goal = user?.workoutDaysPerWeek;
  const percent =
    weekCount !== undefined && goal
      ? Math.min(100, (weekCount / goal) * 100)
      : 0;
  const featured =
    challenges.data?.find((c) => challengeStatus(c) === "Active") ||
    challenges.data?.[0];
  return (
    <>
      <PageHeading
        eyebrow="YOUR DAILY DOSE OF MOMENTUM"
        title={
          firstName
            ? `Let’s make progress, ${firstName}.`
            : "Your next chapter starts here."
        }
        description="Show up for yourself. We’ll take care of the tracking."
      >
        <span className="workspace-badge">
          <span className="status-dot" /> YOUR TRAINING HQ
        </span>
      </PageHeading>
      <section className="dashboard-hero">
        <div className="hero-image" />
        <div className="hero-text">
          <span className="hero-eyebrow">
            <Zap size={13} fill="currentColor" /> BUILT BY CONSISTENCY
          </span>
          <h2>
            YOUR ONLY LIMIT.
            <br />
            <span>IS YOUR NEXT LEVEL.</span>
          </h2>
          <p>
            Every rep. Every session. Every little victory.
            <br />
            Build a stronger you, one workout at a time.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/workouts?log=1">
              <Plus size={18} />
              Log workout
              <ArrowUpRight size={16} />
            </Link>
            <Link className="button hero-secondary" to="/planner">
              Build my plan
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-corner">
          <span className="hero-coordinate">01 / THE WORK STARTS HERE</span>
          <span className="hero-motto">
            EARN YOUR
            <br />
            <strong>EVERYDAY.</strong>
          </span>
        </div>
      </section>
      <div className="section-kicker">
        <span>THE BIG PICTURE</span>
        <span>YOUR ALL-TIME ACTIVITY</span>
      </div>
      <Stats />
      <div className="dashboard-middle">
        <ActivityChart />
        <Panel className="goal-panel">
          <PanelHeading
            title="Show up. Level up."
            subtitle="Your weekly commitment"
          />
          <div className="goal-ring">
            <svg viewBox="0 0 180 180" aria-hidden="true">
              <circle cx="90" cy="90" r="73" className="ring-track" />
              <circle
                cx="90"
                cy="90"
                r="73"
                className="ring-progress"
                strokeDasharray={`${percent * 4.587} 458.7`}
              />
            </svg>
            <div>
              <Target size={18} />
              <strong>
                {weekCount ?? "—"}
                <span> / {goal || "—"}</span>
              </strong>
              <span>workouts this week</span>
            </div>
          </div>
          <p className="goal-message">
            {weekCount === undefined
              ? "Your next session is a step forward."
              : weekCount >= goal
                ? "Commitment met. Look at you go."
                : "Consistency is your superpower."}
          </p>
          <Link
            className="button secondary small full-width"
            to="/workouts?log=1"
          >
            Make today count
            <ArrowUpRight size={15} />
          </Link>
          {workouts.error && (
            <p className="membership-note">
              Weekly activity unavailable. Retry in the activity panel.
            </p>
          )}
        </Panel>
      </div>
      <Panel className="schedule-panel">
        <PanelHeading
          title="Your weekly game plan"
          subtitle="Your latest saved routine. Select a day to explore."
          to="/planner"
          linkText="Open planner"
        />
        {!user ? (
          <Empty
            compact
            icon={CalendarDays}
            title="Make room for progress"
            description="Sign in to see their saved routine."
          />
        ) : (
          <Resource resource={plans}>
            {(data) => (
              <>
                <WeeklySchedule plan={data?.[0]} compact />
                {data?.[0] && (
                  <div className="schedule-footnote">
                    <Badge color="neutral">{data[0].goal}</Badge>
                    <span>
                      {data[0].experienceLevel} · {data[0].workoutDaysPerWeek}{" "}
                      days / week
                    </span>
                  </div>
                )}
              </>
            )}
          </Resource>
        )}
      </Panel>
      <div className="dashboard-bottom">
        <Panel className="recent-panel">
          <PanelHeading
            title="The work you put in"
            subtitle="Your most recent sessions"
            to="/workouts"
            linkText="All workouts"
          />
          {!user ? (
            <Empty
              compact
              title="Your training story lives here"
              description="Sign in to view workout history."
            />
          ) : (
            <Resource resource={workouts}>
              {(data) =>
                data?.length ? (
                  <WorkoutHistory workouts={data.slice(0, 4)} compact />
                ) : (
                  <Empty
                    compact
                    title="Your first win is waiting"
                    description="Log your first workout. Big things start small."
                    to="/workouts?log=1"
                    action="Log a workout"
                  />
                )
              }
            </Resource>
          )}
        </Panel>
        <div className="dashboard-challenge">
          <div className="panel-heading">
            <div>
              <h2>A little friendly competition</h2>
              <p>Find your next challenge</p>
            </div>
            <Link to="/challenges" className="text-link">
              Explore
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <Resource resource={challenges}>
            {() =>
              featured ? (
                <ChallengeCard
                  key={`${featured._id}:${user?._id}`}
                  challenge={featured}
                  compact
                />
              ) : (
                <Panel>
                  <Empty
                    compact
                    icon={Flame}
                    title="The next challenge is coming"
                    description="Challenges from your community will appear here."
                    to="/challenges"
                    action="Explore challenges"
                  />
                </Panel>
              )
            }
          </Resource>
        </div>
      </div>
      <div className="motivation-strip">
        <Dumbbell size={18} />
        <span>
          Progress isn’t always loud. Sometimes, it’s just showing up again.
        </span>
        <span>
          KEEP GOING <ArrowRight size={14} />
        </span>
      </div>
    </>
  );
}
