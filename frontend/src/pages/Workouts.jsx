import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Dumbbell, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  Empty,
  PageHeading,
  Panel,
  PanelHeading,
  Resource,
} from "../components/ui";
import Stats from "../components/Stats";
import WorkoutHistory from "../components/WorkoutHistory";
import WorkoutForm from "../components/WorkoutForm";
import ActivityChart from "../components/ActivityChart";

export default function Workouts() {
  const { user, workouts } = useApp();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const type = params.get("type") || "all";
  const period = params.get("period") || "all";
  const types = [...new Set(workouts.data?.map((w) => w.workoutType) || [])];
  const filtered = useMemo(
    () =>
      (workouts.data || []).filter((w) => {
        const matches =
          `${w.workoutType} ${w.exercises.map((e) => e.name).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return (
          matches &&
          (type === "all" || w.workoutType === type) &&
          (period === "all" ||
            new Date(w.date) >=
              new Date(Date.now() - Number(period) * 86400000))
        );
      }),
    [workouts.data, query, type, period],
  );
  function setParam(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="PUT IN THE WORK"
        title="Every session has a story."
        description="Log your effort. See your progress. Come back stronger."
      >
        <button
          className="button primary"
          disabled={!user}
          onClick={() => setParam("log", "1")}
        >
          <Plus size={18} />
          Log workout
        </button>
      </PageHeading>
      <Stats />
      <div className="tracker-grid">
        <Panel>
          <PanelHeading
            title="Your training journal"
            subtitle="A record of the work that makes you stronger."
          />
          <div className="filter-bar">
            <label className="search-input">
              <Search size={16} />
              <input
                aria-label="Search workouts or exercises"
                type="search"
                placeholder="Search sessions or exercises…"
                value={query}
                onChange={(e) => setParam("q", e.target.value)}
              />
            </label>
            <label className="filter-select">
              <span className="sr-only">Workout type filter</span>
              <select
                value={type}
                onChange={(e) => setParam("type", e.target.value)}
              >
                <option value="all">All types</option>
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="filter-select">
              <span className="sr-only">Workout date filter</span>
              <select
                value={period}
                onChange={(e) => setParam("period", e.target.value)}
              >
                <option value="all">All time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </label>
          </div>
          {!user ? (
            <Empty
              title="Ready when you are"
              description="Sign in to see their workouts and log a session."
            />
          ) : (
            <Resource resource={workouts}>
              {(data) =>
                !data?.length ? (
                  <Empty
                    title="Let’s get your first one on the board"
                    description="A few details are all it takes to start your training story."
                    to="/workouts?log=1"
                    action="Log my first workout"
                  />
                ) : filtered.length ? (
                  <>
                    <div className="list-count">
                      {filtered.length} session
                      {filtered.length === 1 ? "" : "s"}
                      <span>SELECT A SESSION TO VIEW DETAILS</span>
                    </div>
                    <WorkoutHistory workouts={filtered} />
                  </>
                ) : (
                  <Empty
                    icon={SlidersHorizontal}
                    title="No sessions match"
                    description="Try another search, workout type, or date range."
                  />
                )
              }
            </Resource>
          )}
        </Panel>
        <div className="tracker-aside">
          <ActivityChart />
          <Panel className="training-note">
            <Dumbbell size={28} strokeWidth={1.5} />
            <p className="eyebrow">YOUR ONLY COMPETITION IS YOU</p>
            <h3>It all adds up.</h3>
            <p>
              Training volume is the sum of repetitions × weight across every
              set. Track it over time to see the work behind your progress.
            </p>
          </Panel>
        </div>
      </div>
      {params.get("log") === "1" && user && (
        <WorkoutForm key={user._id} onClose={() => setParam("log", "")} />
      )}
    </>
  );
}
