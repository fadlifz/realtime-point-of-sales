"use server";

import { createClient } from "@/lib/supabase/server";
import { FormState } from "@/types/general";
import { Cart, OrderFormState } from "@/types/order";
import {
  orderFormSchema,
  orderTakeawayFormSchema,
} from "@/validations/order-validation";
import { redirect } from "next/navigation";
import midtrans from "midtrans-client";
import { environment } from "@/configs/environment";
import { revalidatePath } from "next/cache";

export async function createOrder(
  prevState: OrderFormState,
  formData: FormData,
) {
  const validatedFields = orderFormSchema.safeParse({
    customer_name: formData.get("customer_name"),
    table_id: formData.get("table_id"),
    status: formData.get("status"),
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

  const supabase = await createClient();

  const orderId = `STARCAFE-${Date.now()}`;

  const [orderResult, tableResult] = await Promise.all([
    supabase.from("orders").insert({
      order_id: orderId,
      customer_name: validatedFields.data.customer_name,
      table_id: validatedFields.data.table_id,
      status: validatedFields.data.status,
    }),
    supabase
      .from("tables")
      .update({
        status:
          validatedFields.data.status === "reserved"
            ? "reserved"
            : "unavailable",
      })
      .eq("id", validatedFields.data.table_id),
  ]);

  const orderError = orderResult.error;
  const tableError = tableResult.error;

  if (orderError || tableError) {
    return {
      status: "error",
      errors: {
        ...prevState.errors,
        _form: [
          ...(orderError ? [orderError.message] : []),
          ...(tableError ? [tableError.message] : []),
        ],
      },
    };
  }

  // 2. Revalidate path agar list order di dashboard/admin terupdate
  revalidatePath("/order");
  revalidatePath("/admin");

  return {
    status: "success",
  };
}

// Ganti bagian createOrderTakeaway saja di actions.ts
export async function createOrderTakeaway(
  prevState: OrderFormState,
  formData: FormData,
) {
  const validatedFields = orderTakeawayFormSchema.safeParse({
    customer_name: formData.get("customer_name"),
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

  const supabase = await createClient();
  const orderId = `STARCAFE-${Date.now()}`;

  const { error } = await supabase.from("orders").insert({
    order_id: orderId,
    customer_name: validatedFields.data.customer_name,
    status: "process",
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

  // PERBAIKAN: Tambahkan parameter "layout" agar semua data di path /order ditarik ulang
  revalidatePath("/order", "layout");
  revalidatePath("/admin", "layout");

  return {
    status: "success",
  };
}

export async function updateReservation(
  prevState: FormState,
  formData: FormData,
) {
  const supabase = await createClient();

  const [orderResult, tableResult] = await Promise.all([
    supabase
      .from("orders")
      .update({
        status: formData.get("status"),
      })
      .eq("id", formData.get("id")),
    supabase
      .from("tables")
      .update({
        status:
          formData.get("status") === "process" ? "unavailable" : "available",
      })
      .eq("id", formData.get("table_id")),
  ]);

  const orderError = orderResult.error;
  const tableError = tableResult.error;

  if (orderError || tableError) {
    return {
      status: "error",
      errors: {
        ...prevState.errors,
        _form: [
          ...(orderError ? [orderError.message] : []),
          ...(tableError ? [tableError.message] : []),
        ],
      },
    };
  }

  revalidatePath("/order");

  return {
    status: "success",
  };
}

export async function addOrderItem(
  prevState: OrderFormState,
  data: {
    order_id: string;
    items: Cart[];
  },
) {
  const supabase = await createClient();

  // PERBAIKAN: Sertakan 'nominal' dalam payload, hanya buang 'menu' (karena 'menu' adalah objek relasi)
  const payload = data.items.map(({ menu, ...item }) => ({
    ...item,
    // Kita pastikan nominal masuk dan bertipe number
    nominal: Number(item.nominal),
  }));

  const { error } = await supabase.from("orders_menus").insert(payload);

  if (error) {
    console.error("Insert Error:", error); // Tambah log agar mudah debug jika gagal
    return {
      status: "error",
      errors: {
        ...prevState,
        _form: [error.message],
      },
    };
  }

  // Penting: Revalidate agar data summary di halaman detail terupdate
  revalidatePath(`/order/${data.order_id}`);

  // Karena ini Server Action, redirect akan memicu refresh client-side
  redirect(`/order/${data.order_id}`);
}

export async function updateStatusOrderitem(
  prevState: FormState,
  formData: FormData,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders_menus")
    .update({
      status: formData.get("status"),
    })
    .eq("id", formData.get("id"));

  if (error) {
    return {
      status: "error",
      errors: {
        ...prevState,
        _form: [error.message],
      },
    };
  }
  revalidatePath("/order", "layout");
  return {
    status: "success",
  };
}

export async function generatePayment(
  prevState: FormState,
  formData: FormData,
) {
  const supabase = await createClient();
  const orderId = formData.get("id");
  const grossAmount = formData.get("gross_amount");
  const customerName = formData.get("customer_name");

  const snap = new midtrans.Snap({
    isProduction: false,
    serverKey: environment.MIDTRANS_SERVER_KEY!,
  });
  const parameter = {
    transaction_details: {
      order_id: `${orderId}`,
      gross_amount: parseFloat(grossAmount as string),
    },
    customer_details: {
      first_name: customerName,
    },
  };

  const result = await snap.createTransaction(parameter);

  if (result.error_messages) {
    return {
      status: "error",
      errors: {
        ...prevState,
        _form: [result.error_messages],
      },
      data: {
        payment_token: "",
      },
    };
  }

  await supabase
    .from("orders")
    .update({ payment_token: result.token })
    .eq("order_id", orderId);

  return {
    status: "success",
    data: {
      payment_token: `${result.token}`,
    },
  };
}

// Tambahkan ini di actions.ts
export async function getPaymentStatus(orderId: string) {
  const snap = new midtrans.Snap({
    isProduction: false,
    serverKey: environment.MIDTRANS_SERVER_KEY!,
  });

  try {
    // Meminta status transaksi ke Midtrans
    const status = await snap.transaction.status(orderId);

    // Ambil nomor VA (tiap bank punya struktur beda, ini cara ambil umumnya)
    const vaNumber =
      status.va_numbers?.[0]?.va_number || status.payment_code || null;
    const bank = status.va_numbers?.[0]?.bank || "Payment Code";

    return { vaNumber, bank, status: status.transaction_status };
  } catch (error) {
    return { vaNumber: null, bank: null, status: null };
  }
}
