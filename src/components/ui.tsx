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
  green: { text: "text-go-400", bg: "bg-go-500/15", border: "border-go-500/40", dot: "bg-go-400" },
  amber: { text: "text-slow-400", bg: "bg-slow-500/15", border: "border-slow-500/40", dot: "bg-slow-400" },
  red: { text: "text-bad-400", bg: "bg-bad-500/15", border: "border-bad-500/40", dot: "bg-bad-400" },
  signal: { text: "text-vms-300", bg: "bg-vms-400/10", border: "border-vms-400/40", dot: "bg-vms-400" },
  grey: { text: "text-stone-400", bg: "bg-stone-500/10", border: "border-stone-500/30", dot: "bg-stone-400" },
} as const;

export type Tone = keyof typeof TONE;

export function ToneBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span className={`font-gmono inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${t.bg} ${t.border} ${t.text}`}>
      <span className={`h-1.5 w-1.5 ${t.dot}`} />
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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="font-gmono mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-stone-400">
          <span className="inline-block h-2 w-2 bg-vms-400" aria-hidden />
          <span>{kicker}</span>
        </div>
        <h2 className="font-display text-[30px] font-semibold leading-none tracking-wide text-stone-100">{title}</h2>
        {blurb && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-stone-400">{blurb}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function FeedNote({ updatedAt, label }: { updatedAt: Date | null; label: string }) {
  return (
    <span className="font-gmono inline-flex items-center gap-2 text-[11px] text-stone-500">
      <span className="led inline-block h-1.5 w-1.5 bg-go-400" />
      {label} · {updatedAt ? updatedAt.toLocaleTimeString("en-HK", { timeZone: "Asia/Hong_Kong", hour12: false }) : "connecting…"}
    </span>
  );
}

export function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <label className={`block ${grow ? "flex-1" : ""}`}>
      <span className="font-gmono mb-1 block text-[10px] uppercase tracking-[0.2em] text-stone-500">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-line bg-ink-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 outline-none focus:border-vms-400/60 focus:ring-1 focus:ring-vms-400/30";

export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card flex items-center justify-between gap-3 border-bad-500/30 p-4 text-sm text-stone-300">
      <span><span className="text-bad-400 font-semibold">Feed down. </span>{message}</span>
      <button onClick={onRetry} className="chip shrink-0 px-3 py-1 text-xs text-vms-300 hover:bg-vms-400/10">Retry</button>
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card h-16 animate-pulse" style={{ animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}
