"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
        name: fd.get("name"),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Signup failed");
      return;
    }
    router.push("/onboarding");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 p-8 rounded-xl bg-white/5 border border-white/10"
    >
      <h1 className="text-2xl font-bold text-white">Create account</h1>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input
        name="name"
        type="text"
        placeholder="Name"
        required
        className="w-full px-4 py-2 rounded bg-white/10 text-white placeholder-white/40 border border-white/20"
      />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full px-4 py-2 rounded bg-white/10 text-white placeholder-white/40 border border-white/20"
      />
      <input
        name="password"
        type="password"
        placeholder="Password (8+ chars)"
        minLength={8}
        required
        className="w-full px-4 py-2 rounded bg-white/10 text-white placeholder-white/40 border border-white/20"
      />
      <button
        type="submit"
        className="w-full py-2 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
      >
        Sign up
      </button>
      <p className="text-center text-white/50 text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-violet-400 hover:text-violet-300">
          Log in
        </a>
      </p>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#0d0d1a] px-2 text-white/40">or</span>
        </div>
      </div>
      <a
        href="/api/auth/google"
        className="flex items-center justify-center gap-2 w-full py-2 rounded border border-white/20 text-white hover:bg-white/5 transition-colors text-sm"
      >
        Continue with Google
      </a>
    </form>
  );
}
