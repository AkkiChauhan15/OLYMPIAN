import { useSearchParams } from "react-router-dom";
import { Crown, Medal, Trophy, UsersRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useResource } from "../hooks/useResource";
import {
  Avatar,
  Badge,
  Empty,
  PageHeading,
  Panel,
  PanelHeading,
  Resource,
} from "../components/ui";
import { formatNumber, challengeStatus } from "../utils/fitness";

export default function Leaderboard() {
  const { user, challenges, revision } = useApp();
  const [params, setParams] = useSearchParams();
  const challenge =
    challenges.data?.find((c) => c._id === params.get("challenge")) ||
    challenges.data?.[0];
  const board = useResource(
    `leaderboard:${challenge?._id}:${revision}`,
    async (signal) => {
      const data = await api.leaderboard(challenge._id, signal);
      if (!Array.isArray(data.leaderboard))
        throw new Error("The rankings could not be read.");
      return data;
    },
    !!challenge,
  );
  const entries = board.data?.leaderboard || [];
  const top = entries.slice(0, 3);
  const remaining = entries.slice(3);
  const mine = entries.find((e) => e.userId === user?._id);
  return (
    <>
      <PageHeading
        eyebrow="THE WORK SPEAKS FOR ITSELF"
        title="A place among the driven."
        description="Celebrate the people who keep showing up. Including you."
      >
        <Badge color="gold">
          <Trophy size={14} />
          LEADERBOARD
        </Badge>
      </PageHeading>
      <Panel className="leaderboard-selector">
        <div>
          <span className="selector-icon">
            <Trophy size={23} />
          </span>
          <div>
            <label htmlFor="leaderboard-challenge">CHOOSE YOUR ARENA</label>
            <select
              id="leaderboard-challenge"
              disabled={!challenges.data?.length}
              value={challenge?._id || ""}
              onChange={(e) => setParams({ challenge: e.target.value })}
            >
              {!challenges.data?.length && (
                <option value="">No challenges available</option>
              )}
              {challenges.data?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        {challenge && (
          <Badge
            color={challengeStatus(challenge) === "Active" ? "lime" : "neutral"}
          >
            {challengeStatus(challenge)}
          </Badge>
        )}
      </Panel>
      <Resource resource={challenges}>
        {(data) =>
          !data?.length ? (
            <Panel>
              <Empty
                icon={Trophy}
                title="Great things start somewhere"
                description="Once a challenge is created, its rankings will be ready here."
                to="/challenges"
                action="Explore the arena"
              />
            </Panel>
          ) : (
            <Resource resource={board}>
              {() =>
                !entries.length ? (
                  <Panel>
                    <Empty
                      icon={UsersRound}
                      title="The podium is waiting"
                      description="This challenge has no participants yet. Join it and start building your place in the rankings."
                      to="/challenges"
                      action="Find your challenge"
                    />
                  </Panel>
                ) : (
                  <>
                    <section className="podium-section">
                      <p className="eyebrow">
                        A LITTLE RECOGNITION FOR A LOT OF EFFORT
                      </p>
                      <h2>The pace setters.</h2>
                      <div className="podium">
                        {[top[1], top[0], top[2]]
                          .filter(Boolean)
                          .map((entry) => (
                            <article
                              className={`podium-card rank-${entry.rank}`}
                              key={entry.userId}
                            >
                              <div className="podium-crown">
                                {entry.rank === 1 ? (
                                  <Crown size={27} />
                                ) : (
                                  <Medal size={23} />
                                )}
                              </div>
                              <Avatar name={entry.name} size="large" />
                              <h3>{entry.name}</h3>
                              {entry.userId === user?._id && (
                                <Badge color="neutral">YOU</Badge>
                              )}
                              <strong>
                                {formatNumber(entry.points)}
                                <span>points</span>
                              </strong>
                              <p>
                                {entry.completedWorkouts} completed workouts
                              </p>
                              <div className="podium-base">
                                <span>
                                  {String(entry.rank).padStart(2, "0")}
                                </span>
                                <span>
                                  {entry.rank === 1
                                    ? "LEADING THE WAY"
                                    : entry.rank === 2
                                      ? "RAISING THE BAR"
                                      : "MAKING IT COUNT"}
                                </span>
                              </div>
                            </article>
                          ))}
                      </div>
                    </section>
                    {mine && (
                      <div className="your-ranking">
                        <span className="your-ranking-icon">
                          <TargetIcon />
                        </span>
                        <div>
                          <p>YOUR PLACE IN THE ARENA</p>
                          <strong>
                            #{mine.rank} <span>Keep your momentum going.</span>
                          </strong>
                        </div>
                        <span>
                          {formatNumber(mine.points)} <small>pts</small>
                        </span>
                      </div>
                    )}
                    <Panel className="ranking-panel">
                      <PanelHeading
                        title="The rest of the field"
                        subtitle={`${entries.length} ranked participant${entries.length === 1 ? "" : "s"} · Ranked by points, then completed workouts`}
                      />
                      {remaining.length ? (
                        <div className="table-scroll">
                          <table className="ranking-table">
                            <thead>
                              <tr>
                                <th scope="col">RANK</th>
                                <th scope="col">ATHLETE</th>
                                <th scope="col">WORKOUTS</th>
                                <th scope="col">POINTS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {remaining.map((entry) => (
                                <tr
                                  key={entry.userId}
                                  className={
                                    entry.userId === user?._id ? "is-you" : ""
                                  }
                                >
                                  <td>
                                    <span
                                      className={`table-rank rank-${entry.rank}`}
                                    >
                                      {entry.rank <= 3 ? (
                                        <Medal size={18} />
                                      ) : (
                                        String(entry.rank).padStart(2, "0")
                                      )}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="athlete-cell">
                                      <Avatar name={entry.name} />
                                      <strong>{entry.name}</strong>
                                      {entry.userId === user?._id && (
                                        <Badge color="lime">YOU</Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    {entry.completedWorkouts}
                                    <span className="table-unit">
                                      {" "}
                                      sessions
                                    </span>
                                  </td>
                                  <td>
                                    <strong>
                                      {formatNumber(entry.points)}
                                    </strong>
                                    <span className="table-unit"> pts</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="section-note">
                          Every athlete is on the podium. The next place is
                          waiting to be claimed.
                        </p>
                      )}
                      <p className="table-footnote">
                        Rankings are provided by the backend’s MongoDB
                        aggregation. Up to 20 participants are returned. Ties
                        use join time.
                      </p>
                    </Panel>
                  </>
                )
              }
            </Resource>
          )
        }
      </Resource>
    </>
  );
}
function TargetIcon() {
  return <Medal size={24} />;
}
