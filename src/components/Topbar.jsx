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
  chevronDown: (
    <svg viewBox="0 0 24 24" className="ml-2 -mr-1 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
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
function SiteMenu({ buttonLabel, Marinas, selectedSiteId, onChangeSite, onFallbackOpen }) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const selectedIndex = Math.max(0, Marinas.findIndex((s) => s.id === selectedSiteId));
  React.useEffect(() => setActiveIndex(selectedIndex), [selectedIndex]);

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
          className="absolute right-0 mt-2 w-[300px] max-h-[520px] overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg"
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
                      (active ? "bg-[hsl(var(--muted))]" : "")
                    }
                  >
                    <span className="truncate">{s.name}</span>
                    {selected && <span className="text-sky-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>}
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
  Marinas = [],
  selectedSiteId,
  onChangeSite,
  onMarinaselect,
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
      <div className="flex h-16 items-center justify-between px-8">
        {/* LEFT: Title */}
        <h1 className="text-base md:text-lg font-semibold tracking-tight">
          Economic Dashboard
        </h1>

        {/* RIGHT: theme toggle + site selector */}
        <div className="flex items-center gap-3">
          <button
            className={`${ghost} h-10 w-10 rounded-full px-0 py-2`}
            onClick={() => setIsDark((v) => !v)}
            aria-label="Toggle theme"
            title={isDark ? "Switch to light" : "Switch to dark"}
          >
            {isDark ? Icon.sun : Icon.moon}
          </button>

          <SiteMenu
            buttonLabel={siteName}
            Marinas={Marinas}
            selectedSiteId={selectedSiteId}
            onChangeSite={onChangeSite}
            onFallbackOpen={onMarinaselect}
          />
        </div>
      </div>
    </header>
  );
}
