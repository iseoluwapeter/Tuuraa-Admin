
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Disables the Web Locks API that Chrome uses to serialize auth token
    // access across tabs. When both onAuthStateChange and getSession() run
    // concurrently they compete for the same lock, causing
    // NavigatorLockAcquireTimeoutError and a permanently stuck loading state.
    lock: (name, acquireTimeout, fn) => fn(),
  },
});