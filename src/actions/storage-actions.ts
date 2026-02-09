"use server";

import { environment } from "@/configs/environment";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  prevPath?: string,
) {
  const supabase = await createClient();

  const newPath = `${path}/${Date.now()}-${file.name}`;

  if (prevPath) {
    const { error } = await supabase.storage.from(bucket).remove([prevPath]);
    if (error) {
      return {
        status: "error",
        errors: {
          _form: [error.message],
        },
      };
    }
  }

  const { error } = await supabase.storage.from(bucket).upload(newPath, file);
  if (error) {
    return {
      status: "error",
      errors: {
        _form: [error.message],
      },
    };
  }

  return {
    status: "success",
    data: {
      url: `${environment.SUPABASE_URL}/storage/v1/object/public/${bucket}/${newPath}`,
      path: newPath,
    },
  };
}

export async function deleteFile(bucket: string, path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceKey);

  // console.log("🚀 MENGIRIM PERINTAH HAPUS FILE");
  // console.log("📍 Path:", path);

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    // console.error("❌ ERROR STORAGE:", error.message);
    return { status: "error", error };
  }

  if (data && data.length > 0) {
    // console.log("✅ BERHASIL DIHAPUS:", data);
    return { status: "success", data };
  } else {
    // console.log("⚠️ ZONK: Supabase gak nemu file di path itu.");
    return { status: "error", message: "File not found" };
  }
}
