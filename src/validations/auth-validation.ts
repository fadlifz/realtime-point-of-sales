import z from "zod";

export const loginSchemaForm = z.object({
  email: z
    .string()
    .min(1, "Emails is required")
    .email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginForm = z.infer<typeof loginSchemaForm>;
