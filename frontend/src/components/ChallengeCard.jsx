import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Flag,
  Flame,
  LoaderCircle,
  Trophy,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { challengeStatus, formatDate, formatNumber } from "../utils/fitness";
import { Badge } from "./ui";

export default function ChallengeCard({
  challenge,
  compact = false,
  index = 0,
}) {
  const { user, revision, refresh, memberships, confirmMembership } = useApp();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const board = useResource(
    `entry:${challenge._id}:${user?._id}:${revision}`,
    (signal) => api.leaderboard(challenge._id, signal),
    !!user,
  );
  const entry = board.data?.leaderboard?.find((e) => e.userId === user?._id);
  const isJoined = !!entry || memberships.has(`${user?._id}:${challenge._id}`);
  const status = challengeStatus(challenge);
  const progress = entry
    ? Math.min(100, (entry.completedWorkouts / challenge.targetWorkouts) * 100)
    : null;
  async function join() {
    if (busy || !user) return;
    setBusy(true);
    setJoinError("");
    try {
      await api.joinChallenge(challenge._id);
      confirmMembership(challenge._id, user._id);
      notify("You’re in. Let’s make every workout count!");
      refresh();
    } catch (error) {
      if (error.status === 409) {
        confirmMembership(challenge._id, user._id);
        notify("You’ve already joined this challenge.");
        board.reload();
      } else {
        setJoinError(error.message);
        notify(error.message, "error");
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`challenge-card theme-${index % 3} ${compact ? "challenge-compact" : ""}`}
    >
      <div className="challenge-art" aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <Flame size={85} strokeWidth={0.8} />
      </div>
      <div className="challenge-content">
        <div className="challenge-card-top">
          <span className="challenge-label">
            <Flame size={13} />
            THE CHALLENGE IS ON
          </span>
          <Badge color={status === "Active" ? "lime" : "neutral"}>
            {status}
          </Badge>
        </div>
        <h3>{challenge.title}</h3>
        <p className="challenge-description">{challenge.description}</p>
        <div className="challenge-facts">
          <span>
            <Flag size={15} />
            <strong>{challenge.targetWorkouts}</strong> workouts
          </span>
          <span>
            <Zap size={15} />
            <strong>{challenge.pointsPerWorkout}</strong> pts / workout
          </span>
        </div>
        <p className="challenge-dates">
          <CalendarDays size={13} />
          {formatDate(challenge.startDate, { year: "numeric" })} —{" "}
          {formatDate(challenge.endDate, { year: "numeric" })}
        </p>
        {entry && (
          <div className="challenge-progress">
            <div>
              <span>Your progress</span>
              <strong>
                {entry.completedWorkouts} / {challenge.targetWorkouts}
              </strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              <Trophy size={12} />
              {formatNumber(entry.points)} points earned{" "}
              <span>Rank #{entry.rank}</span>
            </p>
          </div>
        )}
        {user && board.loading && (
          <p className="membership-note">Checking participation…</p>
        )}
        {user && !board.loading && !entry && (
          <p className="membership-note">
            {isJoined
              ? "Joined. Progress is currently unavailable in the top 20 rankings."
              : board.error
                ? "Participation unavailable. You can still try to join."
                : "Progress is shown when returned in the top 20 rankings."}
            {board.error && (
              <button className="inline-button" onClick={board.reload}>
                Retry
              </button>
            )}
          </p>
        )}
        {joinError && (
          <p className="form-error" role="alert">
            {joinError}
          </p>
        )}
        <div className="challenge-actions">
          <button
            className={`button ${isJoined ? "secondary" : "primary"} small`}
            onClick={join}
            disabled={!user || busy || isJoined || status !== "Active"}
          >
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : isJoined ? (
              <Check size={15} />
            ) : (
              <Zap size={15} />
            )}
            {busy
              ? "Joining…"
              : isJoined
                ? "Joined"
                : status === "Active"
                  ? "Join challenge"
                  : status === "Upcoming"
                    ? "Opens soon"
                    : "Challenge ended"}
          </button>
          <Link
            className="text-link"
            to={`/leaderboard?challenge=${encodeURIComponent(challenge._id)}`}
          >
            Rankings
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
