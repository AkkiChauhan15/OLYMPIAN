import { useState } from "react";
import { Flame, Trophy, Zap } from "lucide-react";
import { useApp } from "../context/AppContext";
import { challengeStatus } from "../utils/fitness";
import ChallengeCard from "../components/ChallengeCard";
import { Badge, Empty, PageHeading, Resource } from "../components/ui";
export default function Challenges() {
  const { user, challenges } = useApp();
  const [filter, setFilter] = useState("All");
  const filtered =
    challenges.data?.filter(
      (c) => filter === "All" || challengeStatus(c) === filter,
    ) || [];
  return (
    <>
      <PageHeading
        eyebrow="GO FURTHER, TOGETHER"
        title="Find your competitive edge."
        description="A shared goal. A little competition. A stronger version of you."
      >
        <Badge color="lime">
          <Flame size={13} />
          THE ARENA
        </Badge>
      </PageHeading>
      <section className="arena-hero">
        <div>
          <p className="eyebrow">GOOD HABITS. GREAT COMPANY.</p>
          <h2>
            Make consistency
            <br />
            your <em>winning move.</em>
          </h2>
          <p>
            Choose a challenge. Show up. Climb the ranks.
            <br />
            Your next workout could be the one that moves you ahead.
          </p>
          <div className="arena-hero-facts">
            <span>
              <DumbbellIcon />
              Train with purpose
            </span>
            <span>
              <Zap size={15} />
              Earn your points
            </span>
            <span>
              <Trophy size={15} />
              Rise together
            </span>
          </div>
        </div>
        <div className="arena-emblem" aria-hidden="true">
          <div />
          <div />
          <Trophy size={110} strokeWidth={0.9} />
          <span>RISE TO THE CHALLENGE</span>
        </div>
      </section>
      <div className="challenge-filter-row">
        <h2>
          Explore challenges <span>{challenges.data?.length ?? "—"}</span>
        </h2>
        <div
          className="segmented compact"
          role="group"
          aria-label="Challenge status"
        >
          {["All", "Active", "Upcoming", "Completed"].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <Resource resource={challenges}>
        {(data) =>
          data?.length ? (
            filtered.length ? (
              <div className="challenge-grid">
                {filtered.map((c, i) => (
                  <ChallengeCard
                    key={`${c._id}:${user?._id}`}
                    challenge={c}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <Empty
                icon={Flame}
                title={`No ${filter.toLowerCase()} challenges right now`}
                description="Try a different filter to explore the rest of the arena."
              />
            )
          ) : (
            <Empty
              icon={Trophy}
              title="The arena is warming up"
              description="There are no challenges yet. Challenges created through your backend will appear here, ready for you to join."
            />
          )
        }
      </Resource>
      <p className="section-note">
        Points and progress come from the backend. Only workouts that qualify
        under a challenge’s rules count toward its target.
      </p>
    </>
  );
}
function DumbbellIcon() {
  return <Flame size={15} />;
}
