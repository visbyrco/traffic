"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- data polling ---------- */

export interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  updatedAt: Date | null;
  refresh: () => void;
}

export function usePoll<T>(url: string, intervalMs: number): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdated] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setData(j);
      setError(null);
      setUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Intentional fetch-on-mount for the polling loop below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    timer.current = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load, intervalMs]);

  return { data, error, loading, updatedAt, refresh: load };
}

/* ---------- formatting ---------- */

export function hkTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16).replace("T", " ");
  return d.toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong", hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ago(iso: string | null | undefined, now: number): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ---------- building blocks ---------- */

export const TONE = {
  green: { text: "text-good", dot: "bg-good" },
  amber: { text: "text-warn", dot: "bg-warn" },
  red: { text: "text-bad", dot: "bg-bad" },
  signal: { text: "text-accent", dot: "bg-accent" },
  grey: { text: "text-muted", dot: "bg-faint" },
} as const;

export type Tone = keyof typeof TONE;

export function StatusLine({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span className="type-eyebrow inline-flex items-center gap-1.5 text-muted">
      <span className={`status-dot ${t.dot}`} aria-hidden />
      {children}
    </span>
  );
}

export function SectionHead({
  kicker,
  title,
  right,
  blurb,
}: {
  kicker: string;
  title: string;
  right?: React.ReactNode;
  blurb?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="type-eyebrow mb-2 text-muted">{kicker}</div>
        <h2 className="type-section text-ink text-balance">{title}</h2>
        {blurb && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{blurb}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function FeedNote({ updatedAt, label }: { updatedAt: Date | null; label: string }) {
  return (
    <span className="type-data inline-flex items-center gap-2 text-muted">
      <span className="status-dot bg-good" aria-hidden />
      {label} · {updatedAt ? updatedAt.toLocaleTimeString("en-HK", { timeZone: "Asia/Hong_Kong", hour12: false }) : "connecting"}
    </span>
  );
}

export function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`block ${grow ? "flex-1" : ""}`}>
      <span className="type-eyebrow mb-1.5 block text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "min-h-9 w-full rounded-md border border-hairline bg-background px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-ink";

export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ledger flex items-center justify-between gap-3 px-4 py-3 text-sm text-ink">
      <span><span className="font-semibold text-bad">Feed down. </span><span className="text-muted">{message}</span></span>
      <button onClick={onRetry} className="rounded-lg border border-hairline px-3 py-1.5 text-xs text-accent transition hover:bg-wash">Retry</button>
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ledger divide-y divide-hairline">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-4">
          <div className="h-2 w-2 rounded-full bg-wash" />
          <div className="h-3 flex-1 rounded bg-wash" />
        </div>
      ))}
    </div>
  );
}
