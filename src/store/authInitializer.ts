// src/store/authInitializer.ts
// Call this once at app root — sets up the Supabase listener and bootstraps session.
// Separated from the store so the listener lifecycle is explicit and testable.

import { supabase } from "../constants/supabaseClient";
import { useAuthStore } from "./authStore";

const LOADING_TIMEOUT_MS = 8_000;

export const initAuth = () => {
  const store = useAuthStore.getState();
  let isMounted = true;

  // Safety net — never hang on loading forever
  const timeoutId = setTimeout(() => {
    if (isMounted && useAuthStore.getState().loading) {
      console.warn("[authInitializer] Timed out — forcing loading: false");
      useAuthStore.setState({ loading: false, initialized: true });
    }
  }, LOADING_TIMEOUT_MS);

  // Bootstrap from existing persisted session first
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!isMounted) return;
    store._resolveSession(session);
  });

  // Then listen for future changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!isMounted) return;

    console.debug("[authInitializer] Event:", event);

    const { _resolveSession } = useAuthStore.getState();

    switch (event) {
      case "INITIAL_SESSION":
        // Covered by getSession() above — skip
        break;

      case "SIGNED_IN":
        await _resolveSession(session);
        break;

      case "SIGNED_OUT":
        useAuthStore.setState(
          {
            session: null,
            user: null,
            role: null,
            loading: false,
            initialized: true,
          },
          false,
        );
        break;

      case "TOKEN_REFRESHED":
        // Only update session — role doesn't change on refresh
        useAuthStore.setState(
          {
            session: session ?? null,
            user: session?.user ?? null,
            loading: false,
          },
          false,
        );
        break;

      case "USER_UPDATED":
        await _resolveSession(session);
        break;

      default:
        break;
    }
  });

  return () => {
    isMounted = false;
    clearTimeout(timeoutId);
    subscription.unsubscribe();
  };
};
