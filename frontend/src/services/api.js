export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
let sessionVersion = 0;
export const advanceSession = () => {
  sessionVersion += 1;
};
export const currentSession = () => sessionVersion;

async function request(path, { signal, method = "GET", body } = {}) {
  const controller = new AbortController();
  const version = sessionVersion;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort("timeout"), 15000);
  try {
    const response = await fetch(`${base}/api${path}`, {
      method,
      credentials: "include",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => null);
    if (
      response.status === 401 &&
      !path.startsWith("/auth/") &&
      version === sessionVersion
    ) {
      window.dispatchEvent(new Event("olympian:unauthorized"));
    }
    if (!response.ok)
      throw new ApiError(
        data?.message ||
          `The server returned an error (${response.status}). Please try again.`,
        response.status,
      );
    if (data === null)
      throw new ApiError(
        "The server returned an unreadable response. Check the API base URL.",
      );
    return data;
  } catch (error) {
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? "The request took too long. Check your backend connection and retry."
        : "Unable to reach OLYMPIAN. Make sure the backend is running and try again.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

const id = encodeURIComponent;
export const api = {
  me: (signal) => request("/auth/me", { signal }),
  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  logout: () => request("/auth/logout", { method: "POST", body: {} }),
  updateUser: (body) => request("/users/me", { method: "PATCH", body }),
  workouts: (userId, signal) =>
    request(`/workouts/user/${id(userId)}`, { signal }),
  stats: (userId, signal) =>
    request(`/workouts/stats/${id(userId)}`, { signal }),
  logWorkout: (body) => request("/workouts", { method: "POST", body }),
  plans: (userId, signal) => request(`/plans/user/${id(userId)}`, { signal }),
  generatePlan: (body) => request("/plans/generate", { method: "POST", body }),
  challenges: (signal) => request("/challenges", { signal }),
  joinChallenge: (challengeId) =>
    request(`/challenges/${id(challengeId)}/join`, {
      method: "POST",
      body: {},
    }),
  leaderboard: (challengeId, signal) =>
    request(`/challenges/${id(challengeId)}/leaderboard`, { signal }),
};
