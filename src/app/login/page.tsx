"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
 const { t, language, setLanguage } = useLanguage();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res = await fetch("/api/auth/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let isSuperAdmin = res.ok;

      if (!res.ok) {
        res = await fetch("/api/auth/staff/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid email or password");
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push(isSuperAdmin ? "/admin" : "/branch");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

   return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row-reverse overflow-hidden">
      {/* Right (visually) — form, 30% */}
      <div className="w-full lg:w-[40%] min-h-screen flex flex-col items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
         <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-building-columns text-white text-sm" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Port Transfer</span>
          </div>
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "fr" : "en")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            {language === "en" ? "FR" : "EN"}
          </button>
        </div>

         <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("welcomeBack")}</h1>
          <p className="text-sm text-slate-500 mb-8">{t("signInSubtitle")}</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("email")}</label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">{t("password")}</label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:underline">
                  {t("forgotPassword")} ?
                </a>
              </div>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "..." : t("signIn")}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-8">
            Access is provisioned by your administrator — contact your super admin for an account.
          </p>
        </div>
      </div>

      {/* Left (visually) — brand panel, 70% */}
      <div className="hidden lg:flex w-[60%] min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 flex-col items-center justify-center relative overflow-hidden p-16">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-blue-600/10" />
        <div className="absolute -left-10 bottom-20 w-56 h-56 rounded-full bg-indigo-500/10" />

        <div className="relative max-w-2xl">
          <h2 className="text-5xl xl:text-6xl font-bold text-white leading-tight mb-10">
            Move money across branches with confidence
          </h2>
          <div className="space-y-6">
            {[
              { icon: "fa-building-columns", text: "Multi-branch transfer network" },
              { icon: "fa-shield-halved", text: "Full sub-ledger & general ledger audit trail" },
              { icon: "fa-qrcode", text: "Secure pickup codes for every transfer" },
              { icon: "fa-chart-line", text: "Real-time commission & volume tracking" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <i className={`fa-solid ${f.icon} text-blue-300 text-lg`} />
                </div>
                <span className="text-base text-slate-200">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 text-xs text-slate-400">
          Port Transfer System — built for speed, accuracy, and trust across every branch.
        </div>
      </div>
    </div>
  );
}