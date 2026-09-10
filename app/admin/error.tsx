"use client";

import BrandHeader from "@/components/BrandHeader";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="bg-texture flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-plum-50 bg-white p-7 text-center shadow-card">
        <BrandHeader className="mb-6" />
        <h1 className="font-serif text-xl font-medium text-plum-700">The dashboard needs a refresh</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Your quiz is still available. Please try loading the dashboard again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="focus-ring mt-6 rounded-xl bg-gradient-to-r from-plum-600 to-berry px-5 py-2.5 text-sm font-semibold text-white shadow-soft"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
