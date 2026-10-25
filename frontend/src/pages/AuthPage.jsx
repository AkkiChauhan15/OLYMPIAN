import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Brand } from "../components/Layout";
import { goals, levels } from "../utils/fitness";

function PasswordField({ label, value, onChange, autoComplete, hint, id }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input">
        <LockKeyhole size={17} />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          maxLength={128}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
          placeholder={
            label === "Confirm password"
              ? "Enter your password again"
              : "Your password"
          }
        />
        <button
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && (
        <p className="auth-field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
export default function AuthPage({ registration = false }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const notify = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [goal, setGoal] = useState("General Fitness");
  const [level, setLevel] = useState("Beginner");
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (
      registration &&
      (name.trim().length < 2 || password.length < 15 || password.length > 128)
    ) {
      setError(
        "Use your full name and a password of 15–128 characters. A memorable passphrase works well.",
      );
      return;
    }
    if (registration && password !== confirm) {
      setError("Your passwords don’t match. Please enter them again.");
      document.getElementById("confirm-password")?.focus();
      return;
    }
    setBusy(true);
    try {
      if (registration)
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          fitnessGoal: goal,
          experienceLevel: level,
          workoutDaysPerWeek: days,
        });
      else await login({ email: email.trim(), password });
      setPassword("");
      setConfirm("");
      notify(
        registration
          ? "Welcome to OLYMPIAN. Your next chapter starts now."
          : "Welcome back. Let’s make progress.",
      );
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`auth-shell ${registration ? "auth-register" : ""}`}>
      <section
        className="auth-story"
        aria-label="Train smarter. Rise stronger."
      >
        <div className="auth-story-image" />
        <Link
          to={registration ? "/login" : "/register"}
          className="auth-brand"
          aria-label="OLYMPIAN"
        >
          <Brand />
        </Link>
        <div className="auth-story-content">
          <p className="auth-story-kicker">
            <Zap size={14} fill="currentColor" />
            BUILT BY CONSISTENCY
          </p>
          <h2>
            STRONGER
            <br />
            <span>STARTS</span>
            <br />
            HERE.
          </h2>
          <p>
            One session. One small victory.
            <br />
            One step closer to the athlete you want to be.
          </p>
          <div className="auth-story-line" />
          <div className="auth-story-principles">
            <span>TRAIN WITH PURPOSE.</span>
            <span>RISE WITH EVERY REP.</span>
          </div>
        </div>
        <div className="auth-story-bottom">
          <span>TRAIN SMARTER. RISE STRONGER.</span>
          <ArrowUpRight size={19} />
        </div>
      </section>
      <main className="auth-main" id="main-content">
        <div className="auth-topline">
          <span>
            {registration ? "ALREADY PART OF THE JOURNEY?" : "NEW TO OLYMPIAN?"}
          </span>
          <Link to={registration ? "/login" : "/register"}>
            {registration ? "Sign in" : "Create an account"}
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <div
          className="auth-form-wrap"
          key={registration ? "register" : "login"}
        >
          <div className="auth-heading">
            <span className="auth-form-symbol">
              {registration ? <Zap size={23} /> : <DumbbellMark />}
            </span>
            <p className="eyebrow">
              {registration ? "YOUR NEXT CHAPTER" : "BACK TO YOUR BETTER SELF"}
            </p>
            <h1>
              {registration ? "Let’s build your momentum." : "Welcome back."}
            </h1>
            <p>
              {registration
                ? "A stronger you starts with a little commitment."
                : "Your goals haven’t gone anywhere. Let’s get after them."}
            </p>
          </div>
          <form onSubmit={submit} className="auth-form">
            <fieldset disabled={busy}>
              {registration && (
                <div className="auth-field">
                  <label htmlFor="full-name">Full name</label>
                  <div className="auth-input">
                    <UserRound size={17} />
                    <input
                      id="full-name"
                      autoComplete="name"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                </div>
              )}
              <div className="auth-field">
                <label htmlFor="email">Email address</label>
                <div className="auth-input">
                  <Mail size={17} />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                  />
                </div>
              </div>
              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  registration ? "new-password" : "current-password"
                }
                hint={
                  registration
                    ? "15–128 characters. Try a memorable passphrase."
                    : undefined
                }
              />
              {registration && (
                <>
                  <PasswordField
                    id="confirm-password"
                    label="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <div className="auth-preferences">
                    <div className="auth-preferences-heading">
                      <span>MAKE IT YOURS</span>
                      <small>
                        Your starting point. You can change this later.
                      </small>
                    </div>
                    <div className="auth-field">
                      <label htmlFor="fitness-goal">Fitness goal</label>
                      <select
                        id="fitness-goal"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                      >
                        {goals.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-grid">
                      <div className="auth-field">
                        <label htmlFor="experience-level">
                          Experience level
                        </label>
                        <select
                          id="experience-level"
                          value={level}
                          onChange={(e) => setLevel(e.target.value)}
                        >
                          {levels.map((l) => (
                            <option key={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div className="auth-field">
                        <label htmlFor="workout-frequency">
                          Weekly frequency
                        </label>
                        <select
                          id="workout-frequency"
                          value={days}
                          onChange={(e) => setDays(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                            <option key={d} value={d}>
                              {d} days / week
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button primary auth-submit"
                type="submit"
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={18} className="spin" />
                ) : registration ? (
                  <Zap size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
                {busy
                  ? registration
                    ? "Creating your account…"
                    : "Signing you in…"
                  : registration
                    ? "Create account"
                    : "Sign in"}
                {!busy && <ChevronRight size={16} />}
              </button>
              <p className="auth-switch">
                {registration
                  ? "Already an Olympian?"
                  : "Your first session starts here."}{" "}
                <Link to={registration ? "/login" : "/register"}>
                  {registration ? "Sign in" : "Create an account"}
                </Link>
              </p>
            </fieldset>
          </form>
          <div className="auth-reassurance">
            <ShieldCheck size={15} />
            <span>Your account. Your progress. A space to focus.</span>
          </div>
        </div>
        <footer className="auth-footer">
          <span>OLYMPIAN / BUILT FOR YOUR BETTER SELF</span>
          <span>A little stronger, every day.</span>
        </footer>
      </main>
    </div>
  );
}
function DumbbellMark() {
  return <Check size={22} />;
}
