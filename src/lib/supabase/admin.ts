import { createClient } from "@supabase/supabase-js";

export const createSupabaseAdmin = (
  p0: string,
  p1: string,
  p2: { auth: { autoRefreshToken: boolean; persistSession: boolean } },
) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Ini Kunci Master-nya
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
};
