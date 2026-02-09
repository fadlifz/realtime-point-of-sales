"use server";
import { revalidatePath } from "next/cache";
import { deleteFile, uploadFile } from "@/actions/storage-actions";
import { createClient } from "@/lib/supabase/server";
import { AuthFormState } from "@/types/auth";
import {
  createUserSchema,
  updateUserSchema,
} from "@/validations/auth-validation";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function createUser(prevState: AuthFormState, formData: FormData) {
  let validatedFields = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role"),
    avatar_url: formData.get("avatar_url"),
  });

  if (!validatedFields.success) {
    return {
      status: "error",
      errors: {
        ...validatedFields.error.flatten().fieldErrors,
        _form: [],
      },
    };
  }

  if (validatedFields.data.avatar_url instanceof File) {
    const { errors, data } = await uploadFile(
      "images",
      "users",
      validatedFields.data.avatar_url,
    );
    if (errors) {
      return {
        status: "error",
        errors: {
          ...prevState.errors,
          _form: [...errors._form],
        },
      };
    }

    validatedFields = {
      ...validatedFields,
      data: {
        ...validatedFields.data,
        avatar_url: data.url,
      },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
    options: {
      data: {
        name: validatedFields.data.name,
        role: validatedFields.data.role,
        avatar_url: validatedFields.data.avatar_url,
      },
    },
  });

  if (error) {
    return {
      status: "error",
      errors: {
        ...prevState.errors,
        _form: [error.message],
      },
    };
  }

  revalidatePath("/admin/user"); // Tambahkan refresh agar data muncul
  return { status: "success" };
}

export async function updateUser(
  prevState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState> {
  let validatedFields = updateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    avatar_url: formData.get("avatar_url"),
  });

  if (!validatedFields.success) {
    return {
      status: "error",
      errors: { ...validatedFields.error.flatten().fieldErrors, _form: [] },
    };
  }

  // --- LOGIC CLEANUP STORAGE ---
  if (validatedFields.data.avatar_url instanceof File) {
    const oldAvatarUrl = formData.get("old_avatar_url") as string;

    // 1. Ambil path file lama dari URL
    // Contoh URL: .../storage/v1/object/public/images/users/nama-file.png
    if (oldAvatarUrl && oldAvatarUrl.includes("/images/")) {
      const pathParts = oldAvatarUrl.split("/images/");
      if (pathParts.length > 1) {
        const oldFilePath = pathParts[1].split("?")[0];
        const decodedOldPath = decodeURIComponent(oldFilePath);

        // 2. Hapus file lama SEBELUM/SESUDAH upload baru
        // Kita panggil deleteFile (pastikan action ini sudah lu buat)
        await deleteFile("images", decodedOldPath);
      }
    }

    // 3. Upload file yang baru
    const { errors, data } = await uploadFile(
      "images",
      "users",
      validatedFields.data.avatar_url,
    );

    if (errors) {
      return {
        status: "error",
        errors: { ...prevState?.errors, _form: [...errors._form] },
      };
    }

    validatedFields = {
      ...validatedFields,
      data: { ...validatedFields.data, avatar_url: data.url },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      name: validatedFields.data.name,
      role: validatedFields.data.role,
      avatar_url: validatedFields.data.avatar_url,
    })
    .eq("id", formData.get("id"));

  if (error) {
    return {
      status: "error",
      errors: { ...prevState?.errors, _form: [error.message] },
    };
  }

  revalidatePath("/admin/user");
  return { status: "success" };
}
// src/app/(dashboard)/admin/user/actions.ts
export async function deleteUser(
  prevState: AuthFormState | null, // Pakai interface lu biar gak merah
  formData: FormData,
): Promise<AuthFormState> {
  const id = formData.get("id") as string;
  const image = formData.get("avatar_url") as string;

  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    if (image && image.includes("/images/")) {
      const pathFile = image.split("/public/images/")[1]?.split("?")[0];
      if (pathFile) await deleteFile("images", decodeURIComponent(pathFile));
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return { status: "error", errors: { _form: [error.message] } };
    }

    revalidatePath("/admin/user");
    return { status: "success" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal hapus";
    return { status: "error", errors: { _form: [msg] } };
  }
}
