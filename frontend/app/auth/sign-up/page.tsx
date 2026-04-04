"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { signupUser, storeSession } from "@/lib/api";

function resolveReturnTo(value: string | null) {
  if (!value || !value.startsWith("/")) return "/dashboard/renter";
  return value;
}

export default function SignUpPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/dashboard/renter");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "renter"
  });
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
      const tokens = await signupUser(form);
      storeSession(tokens);
      router.push(returnTo as Route);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page page-stack">
      <section className="split">
        <article className="hero hero-copy">
          <span className="kicker">Create your presence</span>
          <h1 className="section-title">Start as a renter. Evolve into a host.</h1>
          <p className="lead">This form talks to the live backend signup endpoint and now preserves your return path back into the booking flow.</p>
        </article>
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="field"><label>Full name</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} type="text" placeholder="Bibek Das" /></div>
          <div className="field"><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="you@example.com" /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" placeholder="+91 98xxxxxx" /></div>
          <div className="field"><label>Password</label><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder="Create a strong password" /></div>
          <div className="field"><label>Starting role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="renter">Renter</option><option value="individual_host">Individual host</option><option value="commercial_host">Commercial host</option></select></div>
          {error ? <div className="subtle booking-error">{error}</div> : null}
          <div className="inline-actions">
            <button className="button" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
            <Link className="button-secondary" href={returnTo as Route}>Explore first</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
