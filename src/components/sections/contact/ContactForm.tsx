"use client";

import { useActionState } from "react";
import { sendContact, type ContactState } from "@/app/actions/contact";

const field =
  "w-full rounded-lg border border-line bg-background px-4 py-3 text-base text-foreground placeholder:text-muted/70 outline-none transition-colors duration-150 hover:border-white/15 focus:border-accent md:text-sm";
const labelCls = "mb-2 block text-sm text-secondary";
const errorCls = "mt-2 block text-[13px] text-[#e5484d]";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });

  return (
    <form action={action} data-ball-floor className="space-y-5 rounded-2xl border border-line bg-surface p-6 md:p-8">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label data-ball-floor className="block">
        <span className={labelCls}>Name or organisation</span>
        <input name="name" required placeholder="Jane Perera, Acme Labs" className={field} />
        {state.fieldErrors?.name && <span className={errorCls}>{state.fieldErrors.name[0]}</span>}
      </label>
      <label data-ball-floor className="block">
        <span className={labelCls}>Email</span>
        <input name="email" type="email" required placeholder="jane@acme.com" className={field} />
        {state.fieldErrors?.email && <span className={errorCls}>{state.fieldErrors.email[0]}</span>}
      </label>
      <label data-ball-floor className="block">
        <span className={labelCls}>Message</span>
        <textarea name="message" rows={4} required placeholder="The role, the project, or just hello" className={field} />
        {state.fieldErrors?.message && <span className={errorCls}>{state.fieldErrors.message[0]}</span>}
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary h-12 w-full disabled:opacity-60">
        {pending ? "Sending…" : "Send message"}
      </button>
      {state.message && (
        <p role="status" className={`text-center text-sm ${state.status === "success" ? "text-[#4cc38a]" : "text-[#e5484d]"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
