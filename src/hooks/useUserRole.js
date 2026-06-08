import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Returns the current user's role and permission flags.
 * admin / chief = full access
 * user = read-only (view only)
 * guest = browse-only (no writes)
 */
export function useUserRole() {
  const [role, setRole] = useState(null); // null = loading

  useEffect(() => {
    const isGuest = localStorage.getItem("guest_mode") === "true";
    if (isGuest) {
      setRole("guest");
      return;
    }
    base44.auth.me().then((user) => {
      setRole(user?.role || "user");
    }).catch(() => {
      // Not authenticated and not guest → treat as guest for safety
      setRole("guest");
    });
  }, []);

  const isAdmin = role === "admin";
  const isChief = role === "chief";
  const isGuest = role === "guest";
  const isPendingApproval = role === "unapproved";
  const canEdit = isAdmin || isChief;
  const canManageSettings = isAdmin || isChief;

  return {
    role,
    isAdmin,
    isChief,
    isGuest,
    isPendingApproval,
    canEdit,
    canManageSettings,
  };
}