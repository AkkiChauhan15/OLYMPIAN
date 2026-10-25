import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import { Empty, ErrorState, PageTransition, Skeleton } from "./components/ui";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workouts = lazy(() => import("./pages/Workouts"));
const Planner = lazy(() => import("./pages/Planner"));
const Challenges = lazy(() => import("./pages/Challenges"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Profile = lazy(() => import("./pages/Profile"));
function Page({ children }) {
  const { pathname } = useLocation();
  return (
    <PageTransition key={pathname}>
      <Suspense fallback={<Skeleton lines={5} />}>{children}</Suspense>
    </PageTransition>
  );
}
function AuthStatus() {
  const { error, retry } = useAuth();
  return (
    <main className="auth-status">
      <div className="auth-status-inner">
        {error ? (
          <ErrorState error={error} onRetry={retry} />
        ) : (
          <>
            <p className="eyebrow">OLYMPIAN / YOUR TRAINING SPACE</p>
            <h1>Getting you ready.</h1>
            <Skeleton lines={3} />
            <p className="page-description">Checking your secure session…</p>
          </>
        )}
      </div>
    </main>
  );
}
function ProtectedLayout() {
  const { user, initializing, error, sessionKey } = useAuth();
  if (initializing || error) return <AuthStatus />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppProvider key={sessionKey}>
      <Layout />
    </AppProvider>
  );
}
function GuestRoute() {
  const { user, initializing, error } = useAuth();
  if (initializing || error) return <AuthStatus />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="login" element={<AuthPage key="login" />} />
                <Route
                  path="register"
                  element={<AuthPage key="register" registration />}
                />
              </Route>
              <Route element={<ProtectedLayout />}>
                <Route
                  index
                  element={
                    <Page>
                      <Dashboard />
                    </Page>
                  }
                />
                <Route
                  path="workouts"
                  element={
                    <Page>
                      <Workouts />
                    </Page>
                  }
                />
                <Route
                  path="planner"
                  element={
                    <Page>
                      <Planner />
                    </Page>
                  }
                />
                <Route
                  path="challenges"
                  element={
                    <Page>
                      <Challenges />
                    </Page>
                  }
                />
                <Route
                  path="leaderboard"
                  element={
                    <Page>
                      <Leaderboard />
                    </Page>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Page>
                      <Profile />
                    </Page>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="A little off track?"
                      description="This page doesn’t exist. Your training workspace is just one click away."
                      to="/"
                      action="Back to dashboard"
                    />
                  }
                />
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
