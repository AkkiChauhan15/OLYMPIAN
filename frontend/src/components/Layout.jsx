import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Flame,
  LayoutDashboard,
  Menu,
  Trophy,
  UserRound,
  X,
  Zap,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import { Avatar, Badge } from "./ui";
import { weekStart } from "../utils/fitness";

const links = [
  {
    to: "/",
    title: "Dashboard",
    icon: LayoutDashboard,
    section: "YOUR WORKSPACE",
  },
  { to: "/workouts", title: "Workout Tracker", icon: Dumbbell },
  { to: "/planner", title: "Workout Planner", icon: CalendarDays },
  {
    to: "/challenges",
    title: "Challenges",
    icon: Flame,
    section: "GO FURTHER",
  },
  { to: "/leaderboard", title: "Leaderboard", icon: Trophy },
  { to: "/profile", title: "My Profile", icon: UserRound },
];
export function Brand() {
  return (
    <span className="brand">
      <svg width="31" height="31" viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="m3 38 15-29h9L13 38zm20 0 10-21 13 21H35l-3-7-3 7z"
          fill="currentColor"
        />
      </svg>
      <span>
        OLYMPIAN<span className="brand-dot">®</span>
      </span>
    </span>
  );
}

export default function Layout() {
  const { user, workouts } = useApp();
  const { logout, loggingOut } = useAuth();
  const notify = useToast();
  async function signOut() {
    try {
      await logout();
      notify("You’ve signed out. See you next session.");
    } catch (error) {
      notify(error.message, "error");
    }
  }
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const page =
    links.find((l) => l.to === location.pathname)?.title || "OLYMPIAN";
  const thisWeek = workouts.data?.filter(
    (w) => new Date(w.date) >= weekStart() && new Date(w.date) <= new Date(),
  ).length;
  const progress =
    user && thisWeek !== undefined
      ? Math.min(100, (thisWeek / user.workoutDaysPerWeek) * 100)
      : 0;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && (
        <button
          tabIndex={-1}
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
        id="main-navigation"
      >
        <Link className="brand-link" to="/" aria-label="OLYMPIAN home">
          <Brand />
        </Link>
        <p className="brand-tagline">TRAIN SMARTER. RISE STRONGER.</p>
        <nav>
          {links.map(({ to, title, icon: Icon, section }) => (
            <div key={to}>
              {section && <p className="nav-section">{section}</p>}
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} strokeWidth={1.7} />
                <span>{title}</span>
                {to === "/challenges" && (
                  <span className="nav-spark">
                    <Zap size={12} fill="currentColor" />
                  </span>
                )}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="weekly-mini">
            <span className="mini-icon">
              <Activity size={18} />
            </span>
            <div>
              <strong>Your weekly commitment</strong>
              <p>
                {user
                  ? `${thisWeek ?? "—"} of ${user.workoutDaysPerWeek} workouts`
                  : "Your journey starts here"}
              </p>
            </div>
            <div className="mini-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <Link to="/workouts" className="text-link">
              Keep showing up <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="sidebar-signoff">
            <span className="status-dot" /> BUILT FOR YOUR BETTER SELF{" "}
            <span>V1.0</span>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              id="menu-toggle"
              className="icon-button mobile-menu"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="main-navigation"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="topbar-page">{page}</span>
            <span className="topbar-divider" />
            <span className="topbar-date">
              <CalendarDays size={14} />
              {new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>
          <details className="account-menu" key={location.pathname}>
            <summary aria-label="Account menu">
              <span className="account-name">
                <small>YOUR ACCOUNT</small>
                <strong>{user.name}</strong>
              </span>
              <Avatar name={user.name} />
              <ChevronDown size={13} />
            </summary>
            <div className="account-dropdown">
              <p>
                Signed in as<strong>{user.email}</strong>
              </p>
              <Link to="/profile">
                <UserRound size={16} />
                My profile
                <ArrowUpRight size={14} />
              </Link>
              <button type="button" onClick={signOut} disabled={loggingOut}>
                {loggingOut ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <LogOut size={16} />
                )}
                {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </details>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
          <footer className="page-footer">
            <span>
              <Brand />
            </span>
            <p>A little stronger, every day.</p>
            <Badge color="neutral">YOUR JOURNEY. YOUR PACE.</Badge>
          </footer>
        </main>
      </div>
    </div>
  );
}
