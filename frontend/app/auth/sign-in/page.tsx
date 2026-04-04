"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loginUser, storeSession } from "@/lib/api";

function resolveReturnTo(value: string | null) {
  if (!value || !value.startsWith("/")) return "/dashboard/renter";
  return value;
}

export default function SignInPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/dashboard/renter");
  const [email, setEmail] = useState("host@parkeasyapp.com");
  const [password, setPassword] = useState("parkeasy123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(resolveReturnTo(params.get("returnTo")));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tokens = await loginUser(email, password);
      storeSession(tokens);
      router.push(returnTo as Route);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page-stack">
      <section className="split">
        <article className="hero hero-copy">
          <span className="kicker">Welcome back</span>
          <h1 className="section-title">Re-enter the parking grid.</h1>
          <p className="lead">Use the seeded demo accounts to explore the live backend now. Try `host@parkeasyapp.com` or `admin@parkeasyapp.com` with password `parkeasy123`.</p>
        </article>
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" /></div>
          <div className="field"><label>Password</label><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter your password" /></div>
          {error ? <div className="subtle booking-error">{error}</div> : null}
          <div className="inline-actions">
            <button className="button" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
            <Link className="button-secondary" href={`/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}` as Route}>Create account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
