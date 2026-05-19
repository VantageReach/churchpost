import { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { UserPlus, Trash2, RefreshCw, Check, Clock, Shield, Eye, PenSquare } from "lucide-react";
import { useTeam, useInviteMember, useUpdateRole, useRemoveMember } from "../../hooks/useTeam.js";
import { cn } from "../../lib/utils.js";

const ROLES = [
  {
    value: "ORG_ADMIN",
    label: "Admin",
    icon: Shield,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    desc: "Full access — manage team, settings, and all posts",
  },
  {
    value: "EDITOR",
    label: "Editor",
    icon: PenSquare,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    desc: "Can create, edit, and schedule posts",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    icon: Eye,
    color: "text-gray-500",
    bg: "bg-gray-100",
    desc: "Read-only — can view posts and calendar",
  },
];

function RoleMeta(role) {
  return ROLES.find((r) => r.value === role) ?? ROLES[1];
}

function RoleBadge({ role }) {
  const meta = RoleMeta(role);
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", meta.bg, meta.color)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function Avatar({ name, imageUrl, pending }) {
  const initials = name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div className="relative flex-shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
      ) : (
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[12px] font-bold ring-2 ring-white">
          {initials}
        </div>
      )}
      {pending && (
        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
          <Clock className="h-2 w-2 text-white" />
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, isYou, isAdmin, onRoleChange, onRemove }) {
  const [changing, setChanging] = useState(false);

  async function handleRole(e) {
    setChanging(true);
    await onRoleChange(member.id, e.target.value);
    setChanging(false);
  }

  const isPending = member.clerkId?.startsWith("pending:");

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors group">
      <Avatar name={member.name} pending={isPending} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-gray-800 truncate">{member.name}</p>
          {isYou && (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">You</span>
          )}
          {isPending && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Pending
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate">{member.email}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isAdmin && !isYou ? (
          <select
            value={member.role}
            onChange={handleRole}
            disabled={changing}
            className="text-[12px] font-medium border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white outline-none focus:border-indigo-400 transition-all cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}

        {isAdmin && !isYou && (
          <button
            onClick={() => onRemove(member.id, member.name)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove member"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InviteForm({ onInvite, isLoading, error }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    await onInvite({ email: email.trim(), role });
    setEmail("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@church.com"
          required
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-600 bg-white outline-none focus:border-indigo-400 transition-all"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm flex-shrink-0"
          style={{ background: "var(--brand-primary)" }}
        >
          {isLoading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : success ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {success ? "Invited!" : "Invite"}
        </button>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-3 gap-2">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                "text-left px-3 py-2 rounded-xl border text-[11px] transition-all",
                role === r.value ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <div className={cn("flex items-center gap-1 font-semibold mb-0.5", r.color)}>
                <Icon className="h-3 w-3" />
                {r.label}
              </div>
              <p className="text-gray-400 leading-snug">{r.desc}</p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </form>
  );
}

export default function TeamPanel() {
  const { user } = useUser();
  const { data, isLoading } = useTeam();
  const invite = useInviteMember();
  const updateRole = useUpdateRole();
  const remove = useRemoveMember();

  const me = data?.members?.find((m) => m.clerkId === user?.id);
  const isAdmin = me?.role === "ORG_ADMIN";

  async function handleRemove(id, name) {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    remove.mutate(id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[15px] font-semibold text-gray-900 font-display">Team</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Manage who has access to your ChurchPost workspace.
        </p>
      </div>

      {/* Invite form — admins only */}
      {isAdmin && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">Invite someone</h3>
          <InviteForm
            onInvite={(data) => invite.mutateAsync(data)}
            isLoading={invite.isPending}
            error={invite.isError ? (invite.error?.response?.data?.error || "Invite failed") : null}
          />
        </div>
      )}

      {/* Active members */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
          Members · {data?.members?.length ?? 0}
        </h3>
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50 overflow-hidden">
          {data?.members?.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isYou={member.clerkId === user?.id}
              isAdmin={isAdmin}
              onRoleChange={(id, role) => updateRole.mutateAsync({ id, role })}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {data?.pending?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
            Pending invites · {data.pending.length}
          </h3>
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 divide-y divide-amber-100 overflow-hidden">
            {data.pending.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isYou={false}
                isAdmin={isAdmin}
                onRoleChange={(id, role) => updateRole.mutateAsync({ id, role })}
                onRemove={handleRemove}
              />
            ))}
          </div>
          <p className="text-[11px] text-amber-600">
            These people have been invited but haven't signed in yet. Their role will be applied automatically when they join.
          </p>
        </div>
      )}
    </div>
  );
}
