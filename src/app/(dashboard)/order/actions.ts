"use server";

import { createClient } from "@/lib/supabase/server";
import { FormState } from "@/types/general";
import { OrderFormState } from "@/types/order";
import { orderFormSchema } from "@/validations/order-validation";

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

  const orderId = `WPUCAFE-${Date.now()}`;

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

  return {
    status: "success",
  };
}
