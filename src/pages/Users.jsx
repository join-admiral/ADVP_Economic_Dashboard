import React, { useMemo, useRef, useState } from "react";

/* ---------- tiny headless dropdown for row actions (no deps) ---------- */
function Menu({ open, onClose, anchorRef, children, width = 200 }) {
  const [style, setStyle] = useState({});
  React.useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStyle({
      position: "absolute",
      top: r.bottom + 8 + window.scrollY,
      left: r.right - width + window.scrollX,
      width,
      zIndex: 50,
    });
    const onDoc = (e) => {
      if (!el.contains(e.target)) onClose?.();
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open, anchorRef, width, onClose]);

  if (!open) return null;
  return (
    <div style={style} className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {children}
    </div>
  );
}

const STATUS = [
  { value: "", label: "Role" },
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "VIEWER", label: "Viewer" },
];

export default function Users() {
  // Mock data in the shape your screenshot suggests
  const initial = useMemo(
    () => [
      { id: "u01", email: "mkleszcz@apptension.com", name: "—", roles: ["Admiral User","Admiral Admin"], sites: [] },
      { id: "u02", email: "mkleszcz+1@apptension.com", name: "—", roles: ["Admiral User"], sites: [] },
      { id: "u03", email: "admin@advp.ai", name: "—", roles: ["Admiral User"], sites: [] },
      { id: "u04", email: "john@join-admiral.com", name: "John Howie", roles: ["Admiral Admin"], sites: [] },
      { id: "u05", email: "abuchholz@apptension.com", name: "Arkadiusz Buchholz", roles: ["Admiral Admin"], sites: [] },
      { id: "u06", email: "hkabaca@apptension.com", name: "Halil Kabaca", roles: ["Admiral Admin"], sites: [] },
      { id: "u07", email: "ankitkan1197@gmail.com", name: "Ankit Kan", roles: ["Admiral Admin"], sites: ["Test123"] },
      { id: "u08", email: "neeraj@join-admiral.com", name: "Neeraj Singhal", roles: ["Admiral Admin"], sites: [] },
      { id: "u09", email: "krystal@join-admiral.com", name: "Krystal Cuellar", roles: ["Admiral Admin"], sites: [] },
      { id: "u10", email: "marcel@join-admiral.com", name: "Marcel Martincsek", roles: ["Admiral Admin"], sites: [] },
      { id: "u11", email: "zczarnecki@apptension.com", name: "Zbigniew Czarnecki", roles: ["Admiral Admin"], sites: [] },
      { id: "u12", email: "dillin@join-admiral.com", name: "Dillin de Wet", roles: ["Admiral User"], sites: ["F3 Marina FTL"] },
      { id: "u13", email: "ereyes@f3marina.com", name: "Eris Reyes", roles: ["Admiral User"], sites: ["F3 Marina FTL"] },
    ],
    []
  );

  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = useMemo(() => {
    let res = [...rows];
    if (q.trim()) {
      const needle = q.toLowerCase();
      res = res.filter((r) =>
        [r.email, r.name, (r.roles||[]).join(","), (r.sites||[]).join(",")]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }
    if (roleFilter) {
      res = res.filter((r) => (r.roles || []).includes(roleFilter));
    }
    return res;
  }, [rows, q, roleFilter]);

  // Row actions
  const [openId, setOpenId] = useState(null);
  const btnRefs = useRef({});

  const close = () => setOpenId(null);

  const onEdit = (id) => {
    alert(`Edit user ${id}`);
    close();
  };
  const onChangeRole = (id) => {
    const next = prompt("Set role to one of: OWNER, ADMIN, MANAGER, STAFF, VIEWER");
    if (!next) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, roles: Array.from(new Set([...(r.roles||[]), normalizeRole(next)])) } : r
      )
    );
    close();
  };
  const onSuspendToggle = (id) => {
    // Demo: toggle by tagging "SUSPENDED" role style
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              roles: r.roles?.includes("SUSPENDED")
                ? r.roles.filter((x) => x !== "SUSPENDED")
                : [...(r.roles || []), "SUSPENDED"],
            }
          : r
      )
    );
    close();
  };
  const onResendInvite = (id) => {
    alert(`Resent invite to ${id}`);
    close();
  };
  const onRemove = (id) => {
    if (!confirm("Remove this user?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    close();
  };

  const normalizeRole = (s) => {
    const t = String(s || "").trim().toUpperCase();
    if (t === "OWNER") return "Owner";
    if (t === "ADMIN") return "Admiral Admin";
    if (t === "MANAGER") return "Manager";
    if (t === "STAFF") return "Staff";
    if (t === "VIEWER") return "Viewer";
    return s;
  };

  return (
    <div className="px-5 py-4">
      {/* Header actions */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[22px] font-semibold text-slate-900">Users</div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
          onClick={() => alert("Add new user")}
        >
          <span className="i-[ph--plus-circle] h-4 w-4" />
          Add new user
        </button>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-slate-200 p-3">
          <div className="relative w-full max-w-[280px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-slate-200 bg-white px-9 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 i-[ph--magnifying-glass] h-4 w-4 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-slate-200"
              title="Role"
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 i-[ph--caret-down] h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]">

                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Sites</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-800">
              {filtered.map((r, idx) => {
                const isStriped = idx % 2 === 1;
                return (
                  <tr className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]">

                    <td className="px-4 py-3 font-medium">{r.email}</td>
                    <td className="px-4 py-3">{r.name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(r.roles || []).map((role) => (
                          <span
                            key={role}
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              role === "SUSPENDED"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(r.sites || []).length ? r.sites.join(", ") : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        ref={(el) => (btnRefs.current[r.id] = el)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId((v) => (v === r.id ? null : r.id));
                        }}
                        aria-label="Row actions"
                      >
                        <span className="i-[ph--dots-three-vertical] h-4 w-4" />
                      </button>

                      <Menu
                        open={openId === r.id}
                        onClose={close}
                        anchorRef={{ current: btnRefs.current[r.id] }}
                        width={200}
                      >
                        <div className="flex flex-col py-1 text-sm">
                          <button className="rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => onEdit(r.id)}>Edit</button>
                          <button className="rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => onChangeRole(r.id)}>Change role…</button>
                          <button className="rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => onSuspendToggle(r.id)}>
                            {r.roles?.includes("SUSPENDED") ? "Activate" : "Suspend"}
                          </button>
                          <button className="rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => onResendInvite(r.id)}>Resend invite</button>
                          <div className="mx-2 my-1 h-px bg-slate-200" />
                          <button className="rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => onRemove(r.id)}>Remove</button>
                        </div>
                      </Menu>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr >

                  <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
