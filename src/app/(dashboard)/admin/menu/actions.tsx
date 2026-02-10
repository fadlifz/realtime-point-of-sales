"use server";

import { uploadFile, deleteFile } from "@/actions/storage-actions";
import { MenuFormState } from "@/types/menu";
import { menuSchema } from "@/validations/menu-validation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createMenu(
  prevState: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  console.log("--- 🚀 START CREATE MENU ---");

  // 1. Validasi Input
  const validatedFields = menuSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: parseFloat(formData.get("price") as string),
    discount: parseFloat(formData.get("discount") as string),
    category: formData.get("category"),
    image_url: formData.get("image_url"),
    is_available: formData.get("is_available") === "true" ? true : false,
  });

  if (!validatedFields.success) {
    // console.log(
    //   "❌ Validation Error:",
    //   validatedFields.error.flatten().fieldErrors,
    // );
    return {
      status: "error",
      errors: {
        ...validatedFields.error.flatten().fieldErrors,
        _form: [],
      },
    };
  }

  let finalImageUrl = validatedFields.data.image_url;

  // 2. Proses Upload File
  if (finalImageUrl instanceof File && finalImageUrl.size > 0) {
    // console.log("📂 File detected, uploading to storage...");
    const { errors, data } = await uploadFile("images", "menus", finalImageUrl);

    if (errors) {
      //   console.log("❌ Upload Storage Error:", errors._form);
      return {
        status: "error",
        errors: { ...prevState.errors, _form: [...errors._form] },
      };
    }

    finalImageUrl = data.url;
    console.log("✅ File uploaded successfully:", finalImageUrl);
  }

  // 3. Inisialisasi Admin Client (Bypass RLS)
  // Ini solusinya biar gak kena 'New row violates RLS'
  const supabaseAdmin = createSupabaseAdmin();

  console.log("📡 Inserting data to table 'menus'...");

  const payload = {
    name: validatedFields.data.name,
    description: validatedFields.data.description,
    price: validatedFields.data.price,
    discount: validatedFields.data.discount,
    category: validatedFields.data.category,
    image_url: finalImageUrl as string,
    is_available: validatedFields.data.is_available,
  };

  console.log("📦 Payload:", payload);

  const { data: insertedData, error } = await supabaseAdmin
    .from("menus")
    .insert([payload])
    .select();

  if (error) {
    // console.error("❌ DATABASE INSERT ERROR:", error.message);
    // console.error("🔍 Error Detail:", error);
    return {
      status: "error",
      errors: {
        ...prevState.errors,
        _form: [error.message],
      },
    };
  }

  //   console.log("🎉 SUCCESS! Data inserted:", insertedData);
  //   console.log("--- 🏁 END CREATE MENU ---");

  revalidatePath("/admin/menu");
  return { status: "success" };
}

export async function updateMenu(
  prevState: MenuFormState,
  formData: FormData,
): Promise<MenuFormState> {
  const id = formData.get("id") as string;
  const oldImageUrl = formData.get("old_image_url") as string;

  const validatedFields = menuSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: parseFloat(formData.get("price") as string),
    discount: parseFloat(formData.get("discount") as string),
    category: formData.get("category"),
    image_url: formData.get("image_url"),
    is_available: formData.get("is_available") === "true",
  });

  if (!validatedFields.success) {
    return {
      status: "error",
      errors: { ...validatedFields.error.flatten().fieldErrors, _form: [] },
    };
  }

  let finalImageUrl = validatedFields.data.image_url;

  // Logic Cleanup Storage jika ganti gambar
  if (finalImageUrl instanceof File && finalImageUrl.size > 0) {
    // Hapus file lama jika ada
    if (oldImageUrl && oldImageUrl.includes("/images/")) {
      const oldPath = oldImageUrl.split("/public/images/")[1]?.split("?")[0];
      if (oldPath) await deleteFile("images", decodeURIComponent(oldPath));
    }

    // Upload file baru
    const { errors, data } = await uploadFile("images", "menus", finalImageUrl);
    if (errors)
      return {
        status: "error",
        errors: { ...prevState.errors, _form: errors._form },
      };
    finalImageUrl = data.url;
  }

  const supabaseAdmin = createSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from("menus")
    .update({
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      price: validatedFields.data.price,
      discount: validatedFields.data.discount,
      category: validatedFields.data.category,
      image_url: finalImageUrl as string,
      is_available: validatedFields.data.is_available,
      updated_at: new Date().toISOString(), // Trigger updated_at
    })
    .eq("id", id);

  if (error)
    return {
      status: "error",
      errors: { ...prevState.errors, _form: [error.message] },
    };

  revalidatePath("/admin/menu");
  return { status: "success" };
}
