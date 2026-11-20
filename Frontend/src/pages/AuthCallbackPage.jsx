import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeLogin, showToast } = useApp();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    const token = searchParams.get("token");
    if (!token) {
      showToast("Login token missing. Please try again.", "error");
      navigate("/login", { replace: true });
      return;
    }

    completeLogin(token)
      .then(() => {
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        showToast(err.message || "Authentication failed", "error");
        navigate("/login", { replace: true });
      });
  }, [completeLogin, navigate, searchParams, showToast]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div className="surface-panel" style={{ padding: 32, textAlign: "center", maxWidth: 380 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Connecting Instagram...</h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          Setting up your workspace and loading your bot configuration.
        </p>
      </div>
    </div>
  );
}