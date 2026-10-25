import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useApp } from "../context/AppContext";
import { weeklyActivity, formatNumber } from "../utils/fitness";
import { Panel, PanelHeading, Resource, Empty } from "./ui";

export default function ActivityChart() {
  const { workouts, user } = useApp();
  const [weeks, setWeeks] = useState(1);
  const reduced = useReducedMotion();
  const data = useMemo(
    () => weeklyActivity(workouts.data || [], weeks),
    [workouts.data, weeks],
  );
  const sessions = data.reduce((n, d) => n + d.workouts, 0);
  const minutes = data.reduce((n, d) => n + d.minutes, 0);
  return (
    <Panel className="activity-panel">
      <PanelHeading
        title="Training activity"
        subtitle="Small efforts. Lasting progress."
      >
        <div className="segmented compact" aria-label="Activity period">
          {[1, 4].map((w) => (
            <button
              key={w}
              aria-pressed={weeks === w}
              className={weeks === w ? "selected" : ""}
              onClick={() => setWeeks(w)}
            >
              {w === 1 ? "This week" : "4 weeks"}
            </button>
          ))}
        </div>
      </PanelHeading>
      {!user ? (
        <Empty
          compact
          icon={Activity}
          title="Your consistency, visualized"
          description="Sign in to see their training activity."
        />
      ) : (
        <Resource resource={workouts}>
          {() => (
            <>
              <div className="chart-summary">
                <strong>
                  {formatNumber(minutes)}
                  <span>min</span>
                </strong>
                <span className="chart-legend">
                  <i />
                  Training duration
                </span>
                <span className="chart-session-count">
                  {sessions} session{sessions === 1 ? "" : "s"} this period
                </span>
              </div>
              {sessions === 0 ? (
                <Empty
                  compact
                  icon={Activity}
                  title="A fresh start looks good on you"
                  description="No workouts in this period. Log a session and watch your consistency grow."
                  to="/workouts?log=1"
                  action="Log your first session"
                />
              ) : (
                <>
                  <div
                    className="activity-chart"
                    role="img"
                    aria-label={`Training duration: ${data.map((d) => `${d.label}: ${d.minutes} minutes`).join(", ")}`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data}
                        margin={{ top: 12, right: 8, bottom: 0, left: -24 }}
                      >
                        <defs>
                          <linearGradient
                            id="activity-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#c8ff5f"
                              stopOpacity={0.24}
                            />
                            <stop
                              offset="100%"
                              stopColor="#c8ff5f"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="#273038"
                          strokeDasharray="3 5"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#93a0ae", fontSize: 11 }}
                          minTickGap={30}
                          dy={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#93a0ae", fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#1c2530",
                            border: "1px solid #36404a",
                            borderRadius: 12,
                            color: "#f5f7fa",
                            fontSize: 12,
                          }}
                          formatter={(value) => [`${value} min`, "Training"]}
                          cursor={{ stroke: "#59634c", strokeDasharray: "4 4" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="minutes"
                          stroke="#c8ff5f"
                          strokeWidth={2.5}
                          fill="url(#activity-gradient)"
                          isAnimationActive={!reduced}
                          dot={
                            weeks === 1
                              ? {
                                  fill: "#c8ff5f",
                                  r: 3,
                                  stroke: "#141b23",
                                  strokeWidth: 3,
                                }
                              : false
                          }
                          activeDot={{
                            r: 5,
                            stroke: "#c8ff5f",
                            fill: "#141b23",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="chart-caption">
                    Duration by day, from your saved workout logs. Minutes shown
                    in local time.
                  </p>
                </>
              )}
            </>
          )}
        </Resource>
      )}
    </Panel>
  );
}
