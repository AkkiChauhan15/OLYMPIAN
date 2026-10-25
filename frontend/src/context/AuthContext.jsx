import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api, advanceSession, currentSession } from "../services/api";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const invalidate = useCallback(() => {
    advanceSession();
    setUser(null);
    setSessionKey((n) => n + 1);
  }, []);
  useEffect(() => {
    const expired = () => {
      invalidate();
      setError(null);
      setInitializing(false);
    };
    window.addEventListener("olympian:unauthorized", expired);
    return () => window.removeEventListener("olympian:unauthorized", expired);
  }, [invalidate]);
  useEffect(() => {
    const controller = new AbortController();
    setInitializing(true);
    setError(null);
    api
      .me(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setUser(result.user);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setUser(null);
          if (err.status !== 401) setError(err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitializing(false);
      });
    return () => controller.abort();
  }, [attempt]);
  async function establish(method, body) {
    const result = await api[method](body);
    advanceSession();
    setUser(result.user);
    setError(null);
    setSessionKey((n) => n + 1);
    return result.user;
  }
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.logout();
      invalidate();
    } finally {
      setLoggingOut(false);
    }
  }
  async function updateProfile(body) {
    const version = currentSession();
    const result = await api.updateUser(body);
    // A response from an earlier account session must never restore it after logout.
    if (version === currentSession()) setUser(result.user);
    return result.user;
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        error,
        sessionKey,
        loggingOut,
        logout,
        login: (body) => establish("login", body),
        register: (body) => establish("register", body),
        updateProfile,
        retry: () => setAttempt((n) => n + 1),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
