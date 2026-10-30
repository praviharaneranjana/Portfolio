"use client";

import { useActionState } from "react";
import { sendContact, type ContactState } from "@/app/actions/contact";

const field =
  "w-full rounded-lg border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-zinc-600 outline-none transition focus:border-accent";
const labelCls = "mb-1.5 block font-mono text-[10px] tracking-wider text-muted uppercase";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });

  return (
    <form action={action} className="glass space-y-5 rounded-2xl p-8">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="block">
        <span className={labelCls}>Name / Organisation</span>
        <input name="name" required placeholder="Jane Perera / Acme Labs" className={field} />
        {state.fieldErrors?.name && <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.name[0]}</span>}
      </label>
      <label className="block">
        <span className={labelCls}>Email</span>
        <input name="email" type="email" required placeholder="jane@acme.com" className={field} />
        {state.fieldErrors?.email && <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.email[0]}</span>}
      </label>
      <label className="block">
        <span className={labelCls}>Message</span>
        <textarea name="message" rows={4} required placeholder="The role, the project, or just hello…" className={field} />
        {state.fieldErrors?.message && <span className="mt-1 block text-xs text-red-400">{state.fieldErrors.message[0]}</span>}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-4 font-mono text-xs font-semibold tracking-[0.2em] text-white uppercase shadow-[0_0_30px_rgba(255,77,48,0.3)] transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message ↗"}
      </button>
      {state.message && (
        <p role="status" className={`text-center font-mono text-xs ${state.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
