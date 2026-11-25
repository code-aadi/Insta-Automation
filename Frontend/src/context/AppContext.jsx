import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, BACKEND_URL, clearToken, getToken, setToken } from "../lib/api.js";

const AppContext = createContext(null);

const EMPTY_STATS = {
  totalUsers: 0,
  followersCount: 0,
  incomingMessages: 0,
  outgoingMessages: 0,
};

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("instaauto_theme");
    return saved === "dark" ? "dark" : "light";
  });

  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("instaauto_theme", theme);
  }, [theme]);

  const showToast = useCallback((title, type = "success") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3400);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const refreshAccount = useCallback(async () => {
    const data = await apiFetch("/api/account/me");
    setAccount(data.account);
    return data.account;
  }, []);

  const refreshStats = useCallback(async () => {
    const data = await apiFetch("/api/account/stats");
    setStats(data.stats || EMPTY_STATS);
    return data.stats;
  }, []);

  // Initial load par stored JWT check karo
  useEffect(() => {
    const initAuth = async () => {
      if (!getToken()) {
        setAuthLoading(false);
        return;
      }
      try {
        await Promise.all([refreshAccount(), refreshStats()]);
      } catch {
        clearToken();
        setAccount(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, [refreshAccount, refreshStats]);

  // 401 aane par auto-logout
  useEffect(() => {
    const handleUnauthorized = () => {
      setAccount(null);
      setStats(EMPTY_STATS);
      showToast("Session expired, please login again.", "warning");
    };

    window.addEventListener("instaauto:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("instaauto:unauthorized", handleUnauthorized);
  }, [showToast]);

  // Instagram OAuth start
  const startInstagramLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/instagram`;
  };

  // AuthCallbackPage se JWT save karne ke liye
  const completeLogin = useCallback(
    async (jwtToken) => {
      setToken(jwtToken);
      setAuthLoading(true);
      try {
        await Promise.all([refreshAccount(), refreshStats()]);
        showToast("Instagram account connected!", "success");
      } catch (error) {
        clearToken();
        setAccount(null);
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [refreshAccount, refreshStats, showToast]
  );

  const logout = () => {
    clearToken();
    setAccount(null);
    setStats(EMPTY_STATS);
    showToast("Logged out successfully", "info");
  };

  // Business Info update
  const updateBusinessInfo = async (payload) => {
    try {
      const data = await apiFetch("/api/account/business-info", {
        method: "PATCH",
        body: payload,
      });
      setAccount(data.account);
      showToast("Business info saved", "success");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  // Settings update (isActive, botMode, requireFollow, etc.)
  const updateSettings = async (payload) => {
    try {
      const data = await apiFetch("/api/account/settings", {
        method: "PATCH",
        body: payload,
      });
      setAccount(data.account);
      showToast("Bot settings updated", "success");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };
// Instagram token refresh (naya 60-din ka token)
const refreshInstagramToken = async () => {
  try {
    const data = await apiFetch("/api/account/refresh-token", {
      method: "POST",
    });
    setAccount(data.account);
    showToast("Instagram token refreshed — 60 more days!", "success");
    return data.account;
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  }
};
  // Keyword Rules CRUD
  const addKeywordRule = async (payload) => {
    try {
      const data = await apiFetch("/api/account/rules", {
        method: "POST",
        body: payload,
      });
      setAccount(data.account);
      showToast("Keyword rule added", "success");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  const updateKeywordRule = async (ruleId, payload) => {
    try {
      const data = await apiFetch(`/api/account/rules/${ruleId}`, {
        method: "PATCH",
        body: payload,
      });
      setAccount(data.account);
      showToast("Keyword rule updated", "success");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  const deleteKeywordRule = async (ruleId) => {
    try {
      const data = await apiFetch(`/api/account/rules/${ruleId}`, {
        method: "DELETE",
      });
      setAccount(data.account);
      showToast("Keyword rule deleted", "info");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };
// Provider ke available models fetch (account save nahi hota, sirf list)
const fetchProviderModels = async (payload) => {
  const data = await apiFetch("/api/account/ai-providers/fetch-models", {
    method: "POST",
    body: payload,
  });
  return data.providerModels || [];
};
  // AI Providers (BYOK) CRUD
  const addAiProvider = async (payload) => {
    try {
      const data = await apiFetch("/api/account/ai-providers", {
        method: "POST",
        body: payload,
      });
      setAccount(data.account);
      showToast("AI provider added", "success");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  const updateAiProvider = async (providerId, payload) => {
    try {
      const data = await apiFetch(`/api/account/ai-providers/${providerId}`, {
        method: "PATCH",
        body: payload,
      });
      setAccount(data.account);
      showToast("AI provider updated", "success");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  const deleteAiProvider = async (providerId) => {
    try {
      const data = await apiFetch(`/api/account/ai-providers/${providerId}`, {
        method: "DELETE",
      });
      setAccount(data.account);
      showToast("AI provider deleted", "info");
      return data.account;
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  // Leads & Messages
  const fetchLeads = useCallback((page = 1, limit = 30) => {
    return apiFetch(`/api/account/leads?page=${page}&limit=${limit}`);
  }, []);

  const fetchLeadMessages = useCallback((instagramId) => {
    return apiFetch(`/api/account/leads/${instagramId}/messages`);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        account,
        stats,
        authLoading,
        isAuthenticated: Boolean(account),
        refreshAccount,
        refreshStats,
        startInstagramLogin,
        completeLogin,
        logout,
        updateBusinessInfo,
        updateSettings,
        addKeywordRule,
        updateKeywordRule,
        deleteKeywordRule,
        addAiProvider,
        updateAiProvider,
        deleteAiProvider,
        fetchLeads,
        fetchLeadMessages,
        toasts,
        showToast,
        dismissToast,
        fetchProviderModels,
        refreshInstagramToken
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside <AppProvider>");
  }
  return ctx;
}