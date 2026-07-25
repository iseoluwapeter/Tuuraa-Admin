// src/store/authStore.ts
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../constants/supabaseClient";

export type UserRole = "admin" | "coordinator" | "operator";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  _resolveSession: (session: Session | null) => Promise<void>;
  _setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const INITIAL_STATE: AuthState = {
  session: null,
  user: null,
  role: null,
  loading: true,
  initialized: false,
};

const fetchRole = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[authStore] Failed to fetch role:", error.message);
    return null;
  }

  return (data?.role as UserRole) ?? null;
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...INITIAL_STATE,

      _setLoading: (loading) => set({ loading }, false, "setLoading"),

      _resolveSession: async (session) => {
        if (!session?.user) {
          set(
            {
              session: null,
              user: null,
              role: null,
              loading: false,
              initialized: true,
            },
            false,
            "resolveSession/unauthenticated",
          );
          return;
        }

        const { user } = session;

        // If we already have the role for this user, skip the DB fetch
        const current = get();
        if (current.user?.id === user.id && current.role) {
          set(
            { session, user, loading: false, initialized: true },
            false,
            "resolveSession/sessionRefresh",
          );
          return;
        }

        const role = await fetchRole(user.id);
        set(
          { session, user, role, loading: false, initialized: true },
          false,
          "resolveSession/withRole",
        );
      },

      refreshRole: async () => {
        const { user } = get();
        if (!user) return;
        const role = await fetchRole(user.id);
        set({ role }, false, "refreshRole");
      },

      signOut: async () => {
        set({ loading: true }, false, "signOut/start");
        await supabase.auth.signOut();
        set(
          { ...INITIAL_STATE, loading: false, initialized: true },
          false,
          "signOut/complete",
        );
      },
    })),
    { name: "TuraAuthStore" },
  ),
);
