import { SignIn } from "@clerk/clerk-react";
import { Sparkles, CalendarDays, Users, Zap } from "lucide-react";

const FEATURES = [
  { icon: CalendarDays, text: "Visual scheduling calendar" },
  { icon: Zap, text: "AI-generated post ideas" },
  { icon: Users, text: "Team collaboration & roles" },
];

const PLATFORMS = [
  { label: "FB", color: "#1877F2" },
  { label: "IG", color: "#E1306C" },
  { label: "YT", color: "#FF0000" },
  { label: "TT", color: "#69C9D0" },
];

export default function Login() {
  return (
    <div className="min-h-screen flex bg-[#0D1017]">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(99,102,241,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 80%, rgba(139,92,246,0.10) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Ccircle cx='30' cy='30' r='1' fill='white'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
            style={{ background: "var(--brand-primary)" }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-white font-display font-semibold text-base leading-none block">
              ChurchPost
            </span>
            <span className="text-white/35 text-[11px]">churchpost.social</span>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1
              className="text-[42px] font-display font-bold leading-[1.1] tracking-tight"
              style={{ color: "#F0F0EE" }}
            >
              Schedule smarter,
              <br />
              <span style={{ color: "var(--brand-primary)" }}>reach further.</span>
            </h1>
            <p className="text-white/45 text-[15px] leading-relaxed max-w-[340px]">
              Plan and publish your church's social content across every platform — all from one beautiful dashboard.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "rgba(99,102,241,0.15)" }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: "var(--brand-primary)" }} />
                </div>
                <span className="text-[13px] text-white/55 font-sans">{text}</span>
              </li>
            ))}
          </ul>

          {/* Platform badges */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {PLATFORMS.map(({ label, color }) => (
                <div
                  key={label}
                  className="h-8 w-8 rounded-full border-2 border-[#0D1017] flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: color }}
                >
                  {label}
                </div>
              ))}
            </div>
            <span className="text-[12px] text-white/30">
              Facebook · Instagram · YouTube · TikTok
            </span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-[11px] text-white/15">
          <span>© {new Date().getFullYear()} ChurchPost.social</span>
          <a href="/privacy" className="hover:text-white/40 transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-white/40 transition-colors">Terms</a>
        </div>
      </div>

      {/* Right — Clerk sign-in */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F7F7F5]">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden flex flex-col items-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl mb-3 shadow-lg"
              style={{ background: "var(--brand-primary)" }}
            >
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-display font-bold text-gray-900">ChurchPost</h2>
            <p className="text-sm text-gray-400 mt-1">churchpost.social</p>
          </div>

          <SignIn
            routing="hash"
            appearance={{
              variables: {
                borderRadius: "0.75rem",
              },
              elements: {
                rootBox: "w-full",
                card: "shadow-[0_4px_32px_-8px_rgba(0,0,0,0.10)] border border-black/[0.06] rounded-2xl",
                formButtonPrimary:
                  "text-white font-medium rounded-lg transition-opacity hover:opacity-90",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
