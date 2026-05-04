import * as React from "react";
import { Palette, Search, X, Check, Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { THEMES, THEME_CATEGORIES, Theme } from "./themes";
import { cn } from "../lib/utils";

interface ThemeSwitcherProps {
  variant?: "floating" | "inline";
}

export default function ThemeSwitcher({ variant = "floating" }: ThemeSwitcherProps) {
  const { themeId, theme, setThemeId } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return THEMES.filter((t) => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when modal open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {variant === "floating" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Đổi giao diện"
          title="Đổi giao diện (theme)"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
          style={{
            background: "color-mix(in srgb, var(--theme-surface) 90%, transparent)",
            borderColor: "var(--theme-border)",
            color: "var(--theme-text)",
          }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              background: "var(--theme-accent)",
              color: "var(--theme-accent-fg)",
              boxShadow: "0 0 18px var(--theme-accent-glow)",
            }}
          >
            <Palette className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] ">
            {theme.name}
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Đổi giao diện"
          title="Đổi giao diện (theme)"
          className="flex items-center gap-2 rounded-xl border px-3 py-2 transition-all hover:opacity-80"
          style={{
            background: "color-mix(in srgb, var(--theme-surface) 60%, transparent)",
            borderColor: "var(--theme-border)",
            color: "var(--theme-text-2)",
          }}
        >
          <Palette className="h-4 w-4" style={{ color: "var(--theme-accent)" }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] ">Theme</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
            style={{
              background: "var(--theme-bg-2)",
              borderColor: "var(--theme-border)",
              color: "var(--theme-text)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between gap-4 border-b px-8 py-6"
              style={{ borderColor: "var(--theme-border-soft)" }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--theme-accent)",
                    color: "var(--theme-accent-fg)",
                    boxShadow: "0 0 22px var(--theme-accent-glow)",
                  }}
                >
                  <Palette className="h-5 w-5" />
                </span>
                <div>
                  <h2
                    className="text-xl font-black uppercase  tracking-tight"
                    style={{ color: "var(--theme-text)" }}
                  >
                    Chọn giao diện
                  </h2>
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.25em] "
                    style={{ color: "var(--theme-text-4)" }}
                  >
                    {THEMES.length} theme · cảm hứng từ getdesign.md
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:opacity-80"
                style={{
                  background: "var(--theme-surface)",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-text-3)",
                }}
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search + categories */}
            <div
              className="flex flex-col gap-4 border-b px-8 py-5"
              style={{ borderColor: "var(--theme-border-soft)" }}
            >
              <div
                className="flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{
                  background: "var(--theme-surface)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <Search
                  className="h-4 w-4"
                  style={{ color: "var(--theme-text-4)" }}
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theme: claude, vercel, ferrari, spotify..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: "var(--theme-text)" }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(["all", ...THEME_CATEGORIES] as string[]).map((cat) => {
                  const active = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em]  transition-all"
                      style={{
                        background: active
                          ? "var(--theme-accent)"
                          : "var(--theme-surface)",
                        borderColor: active
                          ? "var(--theme-accent)"
                          : "var(--theme-border)",
                        color: active
                          ? "var(--theme-accent-fg)"
                          : "var(--theme-text-3)",
                      }}
                    >
                      {cat === "all" ? "Tất cả" : cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {filtered.length === 0 ? (
                <div
                  className="flex h-40 items-center justify-center text-sm "
                  style={{ color: "var(--theme-text-4)" }}
                >
                  Không tìm thấy theme phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((t) => (
                    <ThemeCard
                      key={t.id}
                      theme={t}
                      selected={t.id === themeId}
                      onClick={() => {
                        setThemeId(t.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between gap-4 border-t px-8 py-4"
              style={{ borderColor: "var(--theme-border-soft)" }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-[0.25em] "
                style={{ color: "var(--theme-text-4)" }}
              >
                Theme hiện tại:{" "}
                <span style={{ color: "var(--theme-accent)" }}>{theme.name}</span>
              </p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.25em]  transition-all hover:opacity-90"
                style={{
                  background: "var(--theme-accent)",
                  color: "var(--theme-accent-fg)",
                }}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ThemeCardProps {
  theme: Theme;
  selected: boolean;
  onClick: () => void;
}

function ThemeCard({ theme, selected, onClick }: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all",
        selected ? "ring-2" : "hover:-translate-y-0.5"
      )}
      style={{
        background: "var(--theme-surface)",
        borderColor: selected ? "var(--theme-accent)" : "var(--theme-border)",
        // @ts-ignore — CSS var for tailwind ring
        ["--tw-ring-color" as any]: "var(--theme-accent)",
      }}
    >
      {/* Preview window */}
      <div
        className="flex h-24 w-full overflow-hidden rounded-xl border"
        style={{
          background: theme.swatches[0],
          borderColor: theme.swatches[1],
        }}
      >
        <div
          className="w-1/3 border-r"
          style={{ background: theme.swatches[1], borderColor: theme.swatches[2] + "33" }}
        >
          <div className="m-2 h-2 w-6 rounded-full" style={{ background: theme.swatches[2] }} />
          <div
            className="mx-2 mt-1.5 h-1.5 w-12 rounded-full opacity-70"
            style={{ background: theme.swatches[3] }}
          />
          <div
            className="mx-2 mt-1.5 h-1.5 w-10 rounded-full opacity-40"
            style={{ background: theme.swatches[3] }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-2.5">
          <div
            className="h-2 w-1/2 rounded-full"
            style={{ background: theme.swatches[3] }}
          />
          <div
            className="h-1.5 w-3/4 rounded-full opacity-50"
            style={{ background: theme.swatches[3] }}
          />
          <div
            className="h-1.5 w-2/3 rounded-full opacity-50"
            style={{ background: theme.swatches[3] }}
          />
          <div className="mt-auto flex items-center gap-1.5">
            <div
              className="h-3 w-8 rounded-md"
              style={{ background: theme.swatches[2] }}
            />
            <div
              className="h-3 w-3 rounded-md opacity-60"
              style={{ background: theme.swatches[3] }}
            />
          </div>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-black uppercase  tracking-tight"
            style={{ color: "var(--theme-text)" }}
          >
            {theme.name}
          </p>
          <p
            className="mt-0.5 text-[9px] font-black uppercase tracking-[0.2em] "
            style={{ color: "var(--theme-text-4)" }}
          >
            {theme.category}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {theme.mode === "light" ? (
            <Sun className="h-3.5 w-3.5" style={{ color: "var(--theme-text-4)" }} />
          ) : (
            <Moon className="h-3.5 w-3.5" style={{ color: "var(--theme-text-4)" }} />
          )}
          {selected && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{
                background: "var(--theme-accent)",
                color: "var(--theme-accent-fg)",
              }}
            >
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p
        className="line-clamp-2 text-[11px] leading-snug"
        style={{ color: "var(--theme-text-3)" }}
      >
        {theme.description}
      </p>

      {/* Swatch dots */}
      <div className="flex gap-1.5">
        {theme.swatches.map((c, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full ring-1"
            style={{
              background: c,
              // @ts-ignore
              ["--tw-ring-color" as any]: "var(--theme-border)",
            }}
          />
        ))}
      </div>
    </button>
  );
}
