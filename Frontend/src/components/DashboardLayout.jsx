import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bot,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Workflow,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function DashboardLayout({ title, children }) {
  const navigate = useNavigate();
  const { account, theme, toggleTheme, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeRulesCount =
    account?.keywordRules?.filter((r) => r.isActive !== false).length || 0;
  const isBotActive = account?.settings?.isActive ?? false;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <Link to="/" className="brand-wordmark">
              <span className="brand-mark-box">
                <Zap size={15} />
              </span>
              <span>InstaAuto</span>
            </Link>
          </div>

          <nav className="sidebar-nav" aria-label="Workspace navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sidebar-link-main">
                <LayoutDashboard size={17} />
                <span>Overview</span>
              </span>
            </NavLink>

            <NavLink
              to="/automations"
              className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sidebar-link-main">
                <Workflow size={17} />
                <span>Keyword Rules</span>
              </span>
              <span className="sidebar-count">{activeRulesCount}</span>
            </NavLink>

            <NavLink
              to="/ai-studio"
              className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sidebar-link-main">
                <Bot size={17} />
                <span>Business &amp; AI</span>
              </span>
            </NavLink>

            <NavLink
              to="/inbox"
              className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sidebar-link-main">
                <Inbox size={17} />
                <span>Live Inbox</span>
              </span>
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-account">
          <div className="account-row">
            <img
              src="/assets/aistudio/user-avatar_98a5e3b9.png"
              alt="Instagram account avatar"
              className="account-avatar"
            />
            <div className="account-info">
              <span className="account-handle">
                @{account?.username || "instagram"}
              </span>
              <span className="account-meta">
                {account?.businessInfo?.name || "Connected"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ justifyContent: "flex-start" }}
            onClick={handleLogout}
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn btn-ghost btn-icon mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <div className="breadcrumb-trail">
              <span>Workspace</span>
              <span aria-hidden="true">/</span>
              <span className="breadcrumb-current">{title}</span>
            </div>
          </div>

          <div className="topbar-actions">
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 10px",
                borderRadius: 6,
                backgroundColor: isBotActive
                  ? "var(--signal-active-soft)"
                  : "var(--bg-subtle)",
                color: isBotActive ? "var(--signal-active)" : "var(--text-muted)",
              }}
            >
              {isBotActive
                ? `Bot Active · ${(account?.settings?.botMode || "hybrid").toUpperCase()}`
                : "Bot Paused"}
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}