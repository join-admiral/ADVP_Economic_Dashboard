// src/components/Topbar.jsx
import React from "react";

/* icons */
const Icon = {
  sun: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  bellDot: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.4 14.9C20.2 16.4 21 17 21 17H3s3-2 3-9c0-3.3 2.7-6 6-6 .7 0 1.3.1 1.9.3" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <circle cx="18" cy="8" r="3" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
};

/* util: read initial theme */
function getInitialIsDark() {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/* --- Small dropdown menu component --- */
function SiteMenu({
  buttonLabel,
  Marinas,
  selectedSiteId,
  onChangeSite,
  onFallbackOpen, // used if Marinas not provided
}) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const selectedIndex = Math.max(0, Marinas.findIndex((s) => s.id === selectedSiteId));
  React.useEffect(() => setActiveIndex(selectedIndex), [selectedIndex]);

  // click outside to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!menuRef.current || !btnRef.current) return;
      if (menuRef.current.contains(e.target) || btnRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleKey = (e) => {
    if (!open) return;
    if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, Math.max(Marinas.length - 1, 0))); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const site = Marinas[activeIndex];
      if (site) { onChangeSite?.(site); setOpen(false); }
    }
  };

  const buttonClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border " +
    "border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]";

  if (!Marinas?.length) {
    return (
      <button
        ref={btnRef}
        type="button"
        className={buttonClasses}
        onClick={onFallbackOpen}
        aria-label="Select site"
      >
        {buttonLabel}
        {Icon.chevronDown}
      </button>
    );
  }

  return (
    <div className="relative" onKeyDown={handleKey}>
      <button
        ref={btnRef}
        type="button"
        className={buttonClasses}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {buttonLabel}
        {Icon.chevronDown}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute left-0 mt-2 w-[300px] max-h-[520px] overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg"
        >
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Marinas
          </div>

          <ul className="py-1">
            {Marinas.map((s, idx) => {
              const selected = s.id === selectedSiteId;
              const active = idx === activeIndex;
              return (
                <li key={s.id}>
                  <button
                    role="menuitemradio"
                    aria-checked={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => { onChangeSite?.(s); setOpen(false); }}
                    className={
                      "flex w-full items-center justify-between px-4 py-2 text-left text-sm " +
                      (active ? "bg-[hsl(var(--muted))]" : "")}
                  >
                    <span className="truncate">{s.name}</span>
                    {selected && <span className="text-sky-400">{Icon.check}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Topbar({
  siteName = "Select site",
  Marinas = [],                 // [{id, name}]
  selectedSiteId,              // current site id
  onChangeSite,                // (site) => void
  onMenuToggle,
  onMarinaselect,              // fallback open handler if not using `Marinas`
  onOpenSettings,
  onOpenNotifications,
  onOpenProfile,
}) {
  const [isDark, setIsDark] = React.useState(getInitialIsDark);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch {}
  }, [isDark]);

  const ghost =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 " +
    "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]";

  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-b border-[hsl(var(--border))]">
      <div className="flex h-16 flex-row items-center justify-end gap-x-4 px-8">
        {/* hamburger (mobile) */}
        <div
          className="block w-6 cursor-pointer lg:hidden"
          role="button"
          tabIndex={0}
          aria-label="Open menu"
          onClick={onMenuToggle}
        >
          {Icon.menu}
        </div>

        {/* site selector (dropdown fed by live /api/marinas from App) */}
        <SiteMenu
          buttonLabel={siteName}
          Marinas={Marinas}
          selectedSiteId={selectedSiteId}
          onChangeSite={onChangeSite}
          onFallbackOpen={onMarinaselect}
        />

        {/* settings */}
        <button className={`${ghost} h-9 w-9`} onClick={onOpenSettings} aria-label="Tenant settings">
          {Icon.settings}
        </button>

        <div className="flex-1" />

        {/* theme toggle */}
        <button
          className={`${ghost} h-10 w-10 rounded-full px-0 py-2`}
          onClick={() => setIsDark((v) => !v)}
          aria-label="Toggle theme"
          title={isDark ? "Switch to light" : "Switch to dark"}
        >
          {isDark ? Icon.sun : Icon.moon}
        </button>

        {/* notifications */}
        <button
          className={`${ghost} h-10 w-10 rounded-full px-0 py-2 relative`}
          onClick={onOpenNotifications}
          aria-label="Open notifications"
        >
          {Icon.bellDot}
          {/* remove hardcoded unread dot if you prefer; keeping a subtle indicator */}
          <span className="absolute right-2 top-2 inline-block h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* avatar */}
        <div className="relative ml-2 hidden md:block">
          <button type="button" onClick={onOpenProfile} aria-label="Open profile menu">
            <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full cursor-pointer">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[hsl(var(--muted))]">
                M
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
