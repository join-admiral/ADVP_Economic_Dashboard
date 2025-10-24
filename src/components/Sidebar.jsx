import React from "react";
import { NavLink } from "react-router-dom";
import logoLight from "./images/logo.png";
import logoDark from "./images/logo2.png"; // your dark-mode logo

/* icons (same as before) */
const I = {
  grid: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  economy: () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M7 15l3-3 3 3 4-6" />
    <circle cx="18" cy="6" r="1.5" />
  </svg>
),
  checks: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </svg>
  ),
  boat: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76" />
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
      <path d="M12 10v4" />
      <path d="M12 2v3" />
    </svg>
  ),
  vendor: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  bars: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  ),
  anchor: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22V8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      <circle cx="12" cy="5" r="3" />
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

/* --- Nav item --- */
function Item({ to, icon, label }) {
  const base =
    "inline-flex items-center rounded-md h-10 py-2 px-4 text-sm font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 ring-offset-2 ring-offset-[hsl(var(--background))] focus-visible:ring-[hsl(var(--ring))]";
  const inactive =
    "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]";
  const active =
    "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-semibold";

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
      end={to === "/"}
    >
      <span
        className="mr-3 shrink-0"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

/* --- Sidebar --- */
export default function Sidebar() {
  const [isDark, setIsDark] = React.useState(() =>
    document.documentElement.classList.contains("dark")
  );

  // watch for theme changes (so logo swaps immediately)
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-[260px] border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
      <div className="flex grow flex-col gap-y-7 overflow-auto px-6">
     
        {/* header / logo */}
{/* header / logo */}
<div className="flex h-16 items-center justify-start">
  <a href="/" aria-label="Go back home" className="inline-flex items-center">
    {isDark ? (
      <img
        src={logoDark}
        alt="Admiral Dark"
        className="object-contain"
        style={{
          height: "50px",   // 🔹 set your custom dark logo height here
          width: "210px",   // 🔹 set your custom dark logo width here
        }}
        draggable="false"
      />
    ) : (
      <img
        src={logoLight}
        alt="Admiral Light"
        className="object-contain"
        style={{
          height: "40px",   // 🔹 set your custom light logo height here
          width: "170px",   // 🔹 set your custom light logo width here
        }}
        draggable="false"
      />
    )}
  </a>
</div>



        {/* SITE */}
        <nav className="-mx-2 flex grow flex-col gap-y-8">
          <div>
            <h4 className="py-1 pl-4 text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              Site
            </h4>
            <div className="flex grow flex-col gap-y-1">
              <Item to="/" icon={<I.grid />} label="Dashboard" />
              <Item to="/economic-value" icon={<I.economy />} label="Economic Dashboard" />
              <Item to="/activity" icon={<I.checks />} label="Activity log" />
              <Item to="/boats" icon={<I.boat />} label="Boats" />
              <Item to="/vendors" icon={<I.vendor />} label="Vendors" />
            </div>
          </div>
        </nav>

        <div className="mb-4 h-px w-full bg-[hsl(var(--border))]/60" />
      </div>
    </aside>
  );
}
