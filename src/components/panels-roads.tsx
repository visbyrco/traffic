"use client";

import { useMemo, useState } from "react";
import type { Camera } from "@/lib/td";
import {
  FeedNote, Field, PanelError, SectionHead, Skeleton, ToneBadge,
  inputCls, type PollState, type Tone,
} from "./ui";

/* -------------------------------- cameras ------------------------------- */

interface CameraPayload { cameras: Camera[]; count: number }
const PAGE = 24;

export function bust(url: string, token: number): string {
  return `${url}${url.includes("?") ? "&" : "?"}t=${token}`;
}

export function CamerasPanel({ poll, bustToken, onBust }: {
  poll: PollState<CameraPayload>; bustToken: number; onBust: () => void;
}) {
  const [region, setRegion] = useState("all");
  const [district, setDistrict] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [focus, setFocus] = useState<Camera | null>(null);

  const regions = useMemo(() => [...new Set((poll.data?.cameras ?? []).map((c) => c.region))].sort(), [poll.data]);
  const districts = useMemo(() => [...new Set((poll.data?.cameras ?? []).filter((c) => region === "all" || c.region === region).map((c) => c.district))].sort(), [poll.data, region]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (poll.data?.cameras ?? []).filter((c) =>
      (region === "all" || c.region === region) &&
      (district === "all" || c.district === district) &&
      (!needle || `${c.description} ${c.key} ${c.district}`.toLowerCase().includes(needle)));
  }, [poll.data, region, district, q]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const view = list.slice(page * PAGE, (page + 1) * PAGE);

  return (
    <section>
      <SectionHead
        kicker="TD · Traffic snapshots 交通快拍 · ~1,000 CCTV"
        title="CCTV stills 閉路電視"
        blurb="Roadside camera stills from major roads. Frames sit on TD's servers and refresh every few minutes, so hit reload for a fresh one."
        right={<span className="flex items-center gap-3"><FeedNote updatedAt={poll.updatedAt} label="STILLS" />
          <button onClick={onBust} className="chip px-3 py-1.5 text-xs text-vms-300 hover:bg-vms-400/10">Reload frames</button></span>}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Field label="Region">
              <select value={region} onChange={(e) => { setRegion(e.target.value); setDistrict("all"); setPage(0); }} className={inputCls}>
                <option value="all">All regions</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="District">
              <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(0); }} className={inputCls}>
                <option value="all">All districts</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label={`Search · ${list.length} cameras`} grow>
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="e.g. Nathan Road, tunnel, H210F…" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {view.map((c) => (
              <button key={c.key} onClick={() => setFocus(c)} className="card group overflow-hidden text-left transition hover:border-vms-400/40">
                <div className="relative aspect-[4/3] bg-ink-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bust(c.url, bustToken)} alt={c.description} loading="lazy"
                    className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.25"; }} />
                  <span className="font-gmono absolute left-1.5 top-1.5 rounded-[3px] bg-black/75 px-1.5 py-0.5 text-[10px] text-vms-300">{c.key}</span>
                </div>
                <div className="truncate px-2.5 py-2 text-[11px] text-stone-300 group-hover:text-white">{c.description}</div>
              </button>
            ))}
          </div>
          {list.length === 0 && <div className="card mt-2 p-6 text-center text-sm text-stone-400">No cameras match.</div>}
          <div className="mt-4 flex items-center justify-center gap-3 text-sm">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="chip px-3 py-1.5 text-xs disabled:opacity-40">← Prev</button>
            <span className="font-gmono text-xs text-stone-400">Page {page + 1} / {pages}</span>
            <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="chip px-3 py-1.5 text-xs disabled:opacity-40">Next →</button>
          </div>
        </>
      )}
      {focus && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4" onClick={() => setFocus(null)}>
          <div className="card w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bust(focus.url, bustToken)} alt={focus.description} className="max-h-[60vh] w-full bg-black object-contain" />
            <div className="flex flex-wrap items-center gap-2 p-4">
              <span className="font-gmono text-xs text-vms-300">{focus.key}</span>
              <span className="text-sm font-semibold text-white">{focus.description}</span>
              <span className="ml-auto text-[11px] text-stone-500">{focus.region} · {focus.district} · {focus.lat.toFixed(4)}, {focus.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------- detectors ------------------------------ */

export interface DetectorPoint {
  id: string; avgSpeed: number; volume: number; maxOcc: number; lanes: number;
  status: "smooth" | "slow" | "congested"; road: string; district: string;
  lat: number; lng: number; direction: string;
}
interface DetectorPayload { points: DetectorPoint[]; window: { date: string; from: string; to: string } }

const STATUS_TONE: Record<DetectorPoint["status"], Tone> = { smooth: "green", slow: "amber", congested: "red" };

export function DetectorsPanel({ poll }: { poll: PollState<DetectorPayload> }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const points = useMemo(() => poll.data?.points ?? [], [poll.data]);
  const dist = useMemo(() => ({
    smooth: points.filter((p) => p.status === "smooth").length,
    slow: points.filter((p) => p.status === "slow").length,
    congested: points.filter((p) => p.status === "congested").length,
  }), [points]);

  const slowest = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return points
      .filter((p) => (status === "all" || p.status === status) &&
        (!needle || `${p.road} ${p.district} ${p.id}`.toLowerCase().includes(needle)))
      .sort((a, b) => a.avgSpeed - b.avgSpeed)
      .slice(0, 30);
  }, [points, q, status]);

  return (
    <section>
      <SectionHead
        kicker="TD · Detector network 偵測器"
        title="Speeds on major roads 主要道路車速"
        blurb="Volume-weighted speeds from around 800 road detectors, matched to road names. The bands are our call, congested under 25 km/h or occupancy over 50%. The raw numbers are TD's."
        right={<FeedNote updatedAt={poll.updatedAt} label="LIVE" />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : poll.data && (
        <>
          <div className="mb-2 flex items-center gap-2">
            {(["congested", "slow", "smooth"] as const).map((s) => (
              <div key={s} className="h-2.5 rounded-full" style={{
                width: `${Math.max(2, (dist[s] / Math.max(1, points.length)) * 100)}%`,
                background: s === "congested" ? "#ef4444" : s === "slow" ? "#f59e0b" : "#22c55e",
              }} title={`${s}: ${dist[s]}`} />
            ))}
          </div>
          <div className="font-gmono mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
            <span><span className="text-bad-400">■</span> {dist.congested} congested</span>
            <span><span className="text-slow-400">■</span> {dist.slow} slow</span>
            <span><span className="text-go-400">■</span> {dist.smooth} smooth</span>
            <span className="ml-auto">window {poll.data.window.date} {poll.data.window.from}–{poll.data.window.to} HKT</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-3">
            <Field label="Search road / district" grow>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Gloucester, Tolo, Tsing Yi…" className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="all">All</option>
                <option value="congested">Congested first</option>
                <option value="slow">Slow</option>
                <option value="smooth">Smooth</option>
              </select>
            </Field>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="font-gmono border-b border-line text-[10px] uppercase tracking-[0.15em] text-stone-500">
                  <th className="px-4 py-2.5">Road / detector</th>
                  <th className="hidden px-2 py-2.5 sm:table-cell">District</th>
                  <th className="px-2 py-2.5 text-right">Speed</th>
                  <th className="hidden px-2 py-2.5 text-right md:table-cell">Volume</th>
                  <th className="hidden px-2 py-2.5 text-right md:table-cell">Occup.</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {slowest.map((p) => (
                  <tr key={p.id} className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <div className="truncate font-medium text-stone-100">{p.road}</div>
                      <div className="font-gmono text-[10px] text-stone-500">{p.id} · {p.lanes} lanes{p.direction ? ` · ${p.direction}` : ""}</div>
                    </td>
                    <td className="hidden px-2 py-2.5 text-stone-400 sm:table-cell">{p.district}</td>
                    <td className="font-gmono px-2 py-2.5 text-right font-bold text-white">{p.avgSpeed}<span className="text-[10px] font-normal text-stone-500"> km/h</span></td>
                    <td className="font-gmono hidden px-2 py-2.5 text-right text-stone-300 md:table-cell">{p.volume}<span className="text-[10px] text-stone-500">/30s</span></td>
                    <td className="font-gmono hidden px-2 py-2.5 text-right text-stone-300 md:table-cell">{p.maxOcc}%</td>
                    <td className="px-4 py-2.5 text-right"><ToneBadge tone={STATUS_TONE[p.status]}>{p.status}</ToneBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-stone-600">Showing slowest {slowest.length} of {points.length} detectors.</p>
        </>
      )}
    </section>
  );
}
