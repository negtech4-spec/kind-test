"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandHeader from "@/components/BrandHeader";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(searchParams.get("from") || "/admin");
        router.refresh();
        return;
      }

      setLoading(false);
      setError(
        res.status === 503
          ? "Secure admin access has not been configured yet."
          : "Incorrect password."
      );
    } catch {
      setLoading(false);
      setError("Unable to check the password right now. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-sm animate-fadeUp rounded-2xl border border-plum-50 bg-white px-7 py-9 shadow-card">
      <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-plum-50 text-plum-600" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </div>
      <h1 className="mb-1 font-serif text-xl font-medium text-plum-700">
        Secure admin sign in
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-ink/55">
        This dashboard is private. Enter the dedicated admin password to view traffic, quiz activity and leads.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="focus-ring w-full rounded-xl border border-plum-100 px-4 py-3 text-[15px] text-ink placeholder:text-ink/30"
            autoFocus
          />
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || !password}
          className="focus-ring rounded-xl bg-gradient-to-r from-plum-600 to-berry px-6 py-3 text-[15px] font-semibold text-white shadow-soft transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <main className="bg-texture flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <BrandHeader />
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
