import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ToastContainer from "./components/ToastContainer.jsx";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import AiSettingsPage from "./pages/AiSettingsPage.jsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.jsx";
import AutomationsPage from "./pages/AutomationsPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import InboxPage from "./pages/InboxPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = useApp();

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "var(--text-muted)",
        }}
      >
        Loading workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/automations"
            element={
              <ProtectedRoute>
                <AutomationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-studio"
            element={
              <ProtectedRoute>
                <AiSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}