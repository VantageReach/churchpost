import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAuthInterceptor } from "./hooks/useAuthInterceptor.js";
import { useOrgSettings } from "./hooks/useOrgSettings.js";
import { useMe } from "./hooks/useMe.js";
import Layout from "./components/shared/Layout.jsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Compose from "./pages/Compose.jsx";
import Calendar from "./pages/Calendar.jsx";
import Posts from "./pages/Posts.jsx";
import Analytics from "./pages/Analytics.jsx";
import BulkUpload from "./pages/BulkUpload.jsx";
import GraphicBuilder from "./pages/GraphicBuilder.jsx";
import Settings from "./pages/Settings.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";

function Spinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#FAFAF7]">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }}
        />
        <span className="text-sm text-gray-400 font-display tracking-wide">Loading…</span>
      </div>
    </div>
  );
}

function AppShell() {
  const { isSignedIn, isLoaded } = useAuth();
  useAuthInterceptor();
  useOrgSettings();

  const { data: me, isLoading: meLoading } = useMe();

  if (!isLoaded || (isSignedIn && meLoading)) return <Spinner />;

  // Signed-in user with no org → onboarding
  const needsOnboarding = isSignedIn && me && !me.hasOrg;

  return (
    <Routes>
      <Route
        path="/login"
        element={isSignedIn ? <Navigate to={needsOnboarding ? "/onboarding" : "/"} replace /> : <Login />}
      />
      <Route
        path="/onboarding"
        element={isSignedIn ? <Onboarding /> : <Navigate to="/login" replace />}
      />
      <Route element={<ProtectedRoute />}>
        {/* Redirect to onboarding if no org yet */}
        <Route path="/" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="compose" element={<Compose />} />
          <Route path="compose/:id" element={<Compose />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="posts" element={<Posts />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="graphics" element={<GraphicBuilder />} />
          <Route path="bulk-upload" element={<BulkUpload />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/:tab" element={<Settings />} />
        </Route>
      </Route>
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
