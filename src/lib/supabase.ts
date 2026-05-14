import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "portfolio-media";
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@moises.local";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabasePublishableKey as string)
  : null;
