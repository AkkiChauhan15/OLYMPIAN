import { useState } from "react";
import {
  CalendarDays,
  Check,
  Dumbbell,
  LoaderCircle,
  Mail,
  Shield,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { goals, levels, formatDate } from "../utils/fitness";
import Stats from "../components/Stats";
import {
  Avatar,
  Badge,
  Empty,
  PageHeading,
  Panel,
  PanelHeading,
} from "../components/ui";

export default function Profile() {
  const { user } = useApp();
  return (
    <>
      <PageHeading
        eyebrow="THE ATHLETE BEHIND THE EFFORT"
        title="A stronger you starts here."
        description="Your goals, your rhythm, your own kind of progress."
      />
      <Stats />
      {user ? (
        <ProfileContent key={`${user._id}:${user.updatedAt}`} />
      ) : (
        <Panel>
          <Empty
            icon={UserRound}
            title="Let’s put a name to the progress"
            description="Sign in to view your fitness profile."
          />
        </Panel>
      )}
    </>
  );
}
function ProfileContent() {
  const { user, updateProfile } = useApp();
  const notify = useToast();
  const [name, setName] = useState(user.name);
  const [goal, setGoal] = useState(user.fitnessGoal || "General Fitness");
  const [level, setLevel] = useState(user.experienceLevel || "Beginner");
  const [days, setDays] = useState(user.workoutDaysPerWeek || 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty =
    name !== user.name ||
    goal !== user.fitnessGoal ||
    level !== user.experienceLevel ||
    days !== user.workoutDaysPerWeek;
  async function save(event) {
    event.preventDefault();
    if (busy || !dirty) return;
    if (
      !name.trim() ||
      !goal ||
      !levels.includes(level) ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > 7
    ) {
      setError("Enter your name and valid training preferences.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateProfile({
        name: name.trim(),
        fitnessGoal: goal,
        experienceLevel: level,
        workoutDaysPerWeek: days,
      });
      notify("Profile updated. Your goals are set.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="profile-grid">
      <Panel className="athlete-profile">
        <div className="profile-cover">
          <span>BUILT BY YOU.</span>
        </div>
        <div className="athlete-profile-body">
          <Avatar name={user.name} size="large" />
          <Badge color="lime">OLYMPIAN ATHLETE</Badge>
          <h2>{user.name}</h2>
          <p>
            <Mail size={13} />
            {user.email}
          </p>
          <div className="profile-facts">
            <div>
              <Target size={17} />
              <span>
                Fitness goal<strong>{user.fitnessGoal}</strong>
              </span>
            </div>
            <div>
              <TrendingUp size={17} />
              <span>
                Experience<strong>{user.experienceLevel}</strong>
              </span>
            </div>
            <div>
              <CalendarDays size={17} />
              <span>
                Weekly commitment
                <strong>{user.workoutDaysPerWeek} training days</strong>
              </span>
            </div>
          </div>
          {user.createdAt && (
            <p className="member-since">
              Showing up since{" "}
              {formatDate(user.createdAt, {
                month: "long",
                year: "numeric",
                day: undefined,
              })}
            </p>
          )}
        </div>
      </Panel>
      <div>
        <Panel className="profile-settings">
          <PanelHeading
            title="Make it yours"
            subtitle="A few details to keep your training on the right track."
          />
          <form onSubmit={save}>
            <fieldset disabled={busy}>
              <label>
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
              <label>
                Email address
                <input
                  aria-label="Email address"
                  aria-describedby="email-note"
                  value={user.email}
                  type="email"
                  readOnly
                  className="readonly-input"
                />
                <span id="email-note" className="field-note">
                  Email editing is not supported by the current API.
                </span>
              </label>
              <div className="form-grid">
                <label>
                  Fitness goal
                  <select
                    aria-label="Fitness goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  >
                    {!goals.includes(goal) && <option>{goal}</option>}
                    {goals.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Experience level
                  <select
                    aria-label="Experience level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    {levels.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Weekly workout frequency
                <select
                  aria-label="Weekly workout frequency"
                  aria-describedby="frequency-note"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} day{d === 1 ? "" : "s"} per week
                    </option>
                  ))}
                </select>
                <span id="frequency-note" className="field-note">
                  The workout planner supports routines of 3–6 days per week.
                </span>
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="profile-form-footer">
                <span>
                  {dirty
                    ? "You have unsaved changes"
                    : "Your profile is up to date"}
                </span>
                <button
                  className="button primary"
                  type="submit"
                  disabled={!dirty || busy}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </fieldset>
          </form>
        </Panel>
        <div className="development-note">
          <Shield size={22} />
          <div>
            <h3>A space that’s yours</h3>
            <p>
              Your workouts, routines, and training preferences belong to your
              account. You can update your name and training goals here. Your
              email stays linked to this account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
