import { createContext, useContext, useState } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../services/api";
import { useResource } from "../hooks/useResource";

const AppContext = createContext(null);
export function AppProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [revision, setRevision] = useState(0);
  const [memberships, setMemberships] = useState(new Set());
  const confirmMembership = (challengeId, athleteId) =>
    setMemberships(
      (current) => new Set([...current, `${athleteId}:${challengeId}`]),
    );
  const refresh = () => setRevision((n) => n + 1);
  const userId = user?._id;
  const workouts = useResource(
    `workouts:${userId}:${revision}`,
    async (signal) => {
      const data = await api.workouts(userId, signal);
      if (!Array.isArray(data.workouts))
        throw new Error("Workout history could not be read.");
      return data.workouts;
    },
    !!userId,
  );
  const stats = useResource(
    `stats:${userId}:${revision}`,
    async (signal) => {
      const data = await api.stats(userId, signal);
      const fields = [
        "totalWorkouts",
        "totalDurationMinutes",
        "totalSets",
        "totalTrainingVolumeKg",
      ];
      if (
        fields.some(
          (field) =>
            typeof data[field] !== "number" ||
            !Number.isFinite(data[field]) ||
            data[field] < 0,
        )
      )
        throw new Error(
          "The statistics API returned incomplete data. Please retry.",
        );
      return data;
    },
    !!userId,
  );
  const plans = useResource(
    `plans:${userId}:${revision}`,
    async (signal) => {
      const data = await api.plans(userId, signal);
      if (!Array.isArray(data.plans))
        throw new Error("Workout plans could not be read.");
      return data.plans;
    },
    !!userId,
  );
  const challenges = useResource(`challenges:${revision}`, async (signal) => {
    const data = await api.challenges(signal);
    if (!Array.isArray(data)) throw new Error("Challenges could not be read.");
    return data;
  });
  return (
    <AppContext.Provider
      value={{
        user,
        updateProfile,
        refresh,
        revision,
        workouts,
        stats,
        plans,
        challenges,
        memberships,
        confirmMembership,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);
