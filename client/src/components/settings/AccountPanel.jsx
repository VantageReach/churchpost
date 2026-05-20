import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { CreditCard, LifeBuoy, AlertTriangle, ExternalLink, Crown, Zap, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api.js";
import { cn } from "../../lib/utils.js";

const PLAN_CONFIG = {
  FREE: {
    label: "Free",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: Star,
    description: "Getting started — perfect for small teams.",
  },
  STARTER: {
    label: "Starter",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Zap,
    description: "For growing churches with active social presence.",
  },
  PRO: {
    label: "Pro",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    icon: Crown,
    description: "Full access — unlimited posts, advanced analytics, priority support.",
  },
};

function useAccountInfo() {
  return useQuery({
    queryKey: ["account-info"],
    queryFn: () => api.get("/settings").then((r) => r.data),
  });
}

function useTeamCount() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => api.get("/team").then((r) => r.data),
  });
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

export default function AccountPanel() {
  const { user } = useUser();
  const { data: settings } = useAccountInfo();
  const { data: teamData } = useTeamCount();

  const plan = settings?.orgPlan || "FREE";
  const planConfig = PLAN_CONFIG[plan] || PLAN_CONFIG.FREE;
  const PlanIcon = planConfig.icon;
  const memberCount = (teamData?.members?.length || 0) + (teamData?.pending?.length || 0);
  const orgName = settings?.orgName || "";
  const orgSlug = settings?.orgSlug || "";

  return (
    <div className="space-y-8 max-w-xl">
      {/* Current Plan */}
      <Section title="Plan & Billing">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-5 flex items-start gap-4">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", planConfig.bg)}>
              <PlanIcon className={cn("h-5 w-5", planConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-semibold text-gray-900">{planConfig.label} Plan</span>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", planConfig.bg, planConfig.color)}>
                  {plan}
                </span>
              </div>
              <p className="text-[12px] text-gray-500 mt-0.5">{planConfig.description}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Team Members</div>
              <div className="text-[15px] font-semibold text-gray-800 mt-0.5">{memberCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Organization</div>
              <div className="text-[13px] font-medium text-gray-700 mt-0.5 truncate">{orgName}</div>
              {orgSlug && (
                <div className="text-[11px] text-gray-400 truncate">{orgSlug}.churchpost.social</div>
              )}
            </div>
          </div>

          {plan !== "PRO" && (
            <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60">
              <p className="text-[12px] text-gray-600 mb-3">
                Billing is managed by the ChurchPost team. To upgrade your plan or ask about pricing, reach out and we'll get you set up.
              </p>
              <a
                href="mailto:billing@churchpost.social?subject=Plan%20Upgrade%20Request"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Contact us to upgrade
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          )}
        </div>
      </Section>

      {/* Support */}
      <Section title="Support">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <LifeBuoy className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-800">Get help from our team</div>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Questions, feature requests, or something broken? We typically respond within one business day.
              </p>
              <a
                href="mailto:hello@churchpost.social"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors mt-2"
              >
                hello@churchpost.social
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Account info */}
      <Section title="Your Account">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Signed in as</span>
            <span className="font-medium text-gray-800">{user?.primaryEmailAddress?.emailAddress || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-800">{user?.fullName || "—"}</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] text-gray-400">
              To update your name or email, visit your{" "}
              <a
                href="https://accounts.clerk.dev/user"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline"
              >
                Clerk account settings
              </a>
              .
            </p>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-gray-800">Delete Organization</div>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Permanently delete your organization and all posts, media, and settings. This cannot be undone.
              </p>
              <a
                href="mailto:hello@churchpost.social?subject=Delete%20My%20Organization"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors mt-2"
              >
                Contact support to delete account
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
