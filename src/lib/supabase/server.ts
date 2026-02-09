import { environment } from "@/configs/environment";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CreateClientOptions = {
  isAdmin?: boolean;
};

export async function createClient({
  isAdmin = false,
}: CreateClientOptions = {}) {
  const cookieStore = await cookies();
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } =
    environment;

  // DEBUG: Cek apakah Key benar-benar ada saat fungsi dipanggil
  if (isAdmin) {
    console.log("🛠️ DEBUG ADMIN MODE:");
    console.log("- URL:", SUPABASE_URL);
    // Kita cek 5 karakter terakhir saja biar aman
    console.log(
      "- Key Admin Terdeteksi:",
      SUPABASE_SERVICE_ROLE_KEY?.slice(-5),
    );
    console.log("- Key Anon Terdeteksi:", SUPABASE_ANON_KEY?.slice(-5));
  }

  const finalKey = isAdmin ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;

  return createServerClient(SUPABASE_URL!, finalKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Server Component safe */
        }
      },
    },
  });
}
