import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, Bot, Images, Inbox, LayoutDashboard, LogOut, Menu,
  MessageSquare, Moon, Sun, Workflow, Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function DashboardLayout({ title = "Workspace", children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, commentRules, theme, toggleTheme, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeRulesCount = account?.keywordRules?.filter((r) => r.isActive !== false).length || 0;
  const activeCommentCount = (commentRules || []).filter((r) => r.isActive !== false).length;
  const isBotActive = account?.settings?.isActive ?? false;
  const isCommentZone = location.pathname.startsWith("/comments");

  const groups = [
    {
      label: "DM Automation",
      tone: "dm",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "DM Overview" },
        { to: "/automations", icon: Workflow, label: "Keyword Rules", count: activeRulesCount },
        { to: "/inbox", icon: Inbox, label: "Live Inbox" },
      ],
    },
    {
      label: "Comment Automation",
      tone: "comment",
      items: [
        { to: "/comments", icon: MessageSquare, label: "Comment Rules", count: activeCommentCount, end: true },
        { to: "/comments/media", icon: Images, label: "Media Library" },
        { to: "/comments/activity", icon: Activity, label: "Comment Activity" },
      ],
    },
    {
      label: "Workspace",
      tone: "neutral",
      items: [{ to: "/ai-studio", icon: Bot, label: "Business & AI" }],
    },
  ];

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div className="app-shell" data-zone={isCommentZone ? "comment" : "dm"}>
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}

      <aside className={`app-sidebar ${mobileMenuOpen ? "is-open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <Link to="/" className="brand-wordmark">
              <span className="brand-mark-box"><Zap size={15} /></span>
              <span>InstaAuto</span>
            </Link>
          </div>

          <nav className="sidebar-nav" aria-label="Workspace navigation">
            {groups.map((group) => (
              <div key={group.label} className={`sidebar-group sidebar-group--${group.tone}`}>
                <span className="sidebar-group-label">
                  <span className="sidebar-group-dot" aria-hidden="true" />
                  {group.label}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="sidebar-link-main">
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </span>
                      {item.count !== undefined && <span className="sidebar-count">{item.count}</span>}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-account">
          <div className="account-row">
            <img src="/assets/aistudio/user-avatar_98a5e3b9.png" alt="" className="account-avatar" />
            <div className="account-info">
              <span className="account-handle">@{account?.username || "instagram"}</span>
              <span className="account-meta">{account?.businessInfo?.name || "Connected"}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }} onClick={handleLogout}>
            <LogOut size={15} /><span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button type="button" className="btn btn-ghost btn-icon mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
              <Menu size={18} />
            </button>
            <div className="breadcrumb-trail">
              <span>{isCommentZone ? "Comments" : "DMs"}</span>
              <span aria-hidden="true">/</span>
              <span className="breadcrumb-current">{title}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`zone-chip zone-chip--${isCommentZone ? "comment" : "dm"}`}>
              {isCommentZone ? <MessageSquare size={13} /> : <Inbox size={13} />}
              {isCommentZone ? `${activeCommentCount} comment rules` : `${activeRulesCount} DM rules`}
            </span>
            <span className="bot-state-chip" data-on={isBotActive}>
              {isBotActive ? `Bot Active · ${(account?.settings?.botMode || "hybrid").toUpperCase()}` : "Bot Paused"}
            </span>
            <button type="button" className="btn btn-secondary btn-icon" onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}