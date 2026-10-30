"use server";

import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.email("Please enter a valid email"),
  message: z.string().trim().min(10, "Message is a little short").max(5000),
  // Honeypot: real users never fill this hidden field.
  company: z.string().max(0).optional(),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message", string[]>>;
};

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, message } = parsed.data;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;

  if (!apiKey || !to) {
    console.warn("[contact] RESEND_API_KEY / CONTACT_TO_EMAIL not set — message not sent:", { name, email });
    return { status: "error", message: "The contact form isn't configured yet. Please email me directly." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>",
      to,
      reply_to: email,
      subject: `Portfolio message from ${name}`,
      text: `${message}\n\n— ${name} <${email}>`,
    }),
  });

  if (!res.ok) {
    console.error("[contact] Resend error", res.status, await res.text());
    return { status: "error", message: "Something went wrong. Please email me directly." };
  }
  return { status: "success", message: "Thanks! I'll get back to you soon." };
}
