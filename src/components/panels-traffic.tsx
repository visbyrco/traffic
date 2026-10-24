"use client";

import { useMemo, useState } from "react";
import type { Incident, JourneyReading } from "@/lib/td";
import { COLOUR_LABEL } from "@/lib/td";
import {
  FeedNote, Field, PanelError, SectionHead, Skeleton, ToneBadge,
  ago, hkTime, inputCls, type PollState, type Tone,
} from "./ui";

/* ------------------------------- incidents ------------------------------ */

interface IncidentPayload { incidents: Incident[]; count: number }

function incidentTone(status: string): Tone {
  const s = status.toUpperCase();
  if (/CLEAR|END|NORMAL|RESUM/.test(s)) return "green";
  if (/NEW/.test(s)) return "red";
  return "amber";
}

export function IncidentsPanel({ poll, now }: { poll: PollState<IncidentPayload>; now: number }) {
  const [q, setQ] = useState("");
  const [tone, setTone] = useState<"all" | Tone>("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const items = poll.data?.incidents ?? [];
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (tone !== "all" && incidentTone(i.status) !== tone) return false;
      if (!needle) return true;
      return [i.location, i.content, i.district, i.heading, i.direction, i.detail]
        .join(" ").toLowerCase().includes(needle);
    });
  }, [poll.data, q, tone]);

  return (
    <section>
      <SectionHead
        kicker="TD · Special traffic news 交通特別消息"
        title="Incidents and closures 事故與封路"
        blurb="Accidents, lane closures and special arrangements from the Transport Department. Refreshes about every minute."
        right={<FeedNote updatedAt={poll.updatedAt} label="LIVE" />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={5} /> : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <Field label="Search location / road" grow>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Cross-Harbour, Nathan Road…" className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={tone} onChange={(e) => setTone(e.target.value as Tone | "all")} className={inputCls}>
                <option value="all">All ({poll.data?.count ?? 0})</option>
                <option value="red">New / urgent</option>
                <option value="amber">Ongoing</option>
                <option value="green">Cleared</option>
              </select>
            </Field>
          </div>
          {list.length === 0 && <div className="card p-6 text-center text-sm text-stone-400">No incidents match. Quiet roads, for now.</div>}
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((i, idx) => {
              const t = incidentTone(i.status);
              const expanded = open === i.id;
              return (
                <article key={`${i.id}-${idx}`} className={`card rise p-4 rise-${Math.min(idx % 4, 3)}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ToneBadge tone={t}>{i.status || i.heading}</ToneBadge>
                    {i.detail && <span className="text-[11px] text-stone-500">{i.detail}</span>}
                    <span className="font-gmono ml-auto text-[11px] text-stone-500" title={i.announcedAt}>
                      {hkTime(i.announcedAt)} · {ago(i.announcedAt, now)}
                    </span>
                  </div>
                  <h3 className="font-display text-[15px] font-semibold text-white">
                    {i.location || i.heading}
                    {i.direction && <span className="text-stone-400"> → {i.direction}</span>}
                  </h3>
                  <div className="mb-2 flex flex-wrap gap-1.5 pt-1.5">
                    {i.district && <span className="chip px-2 py-0.5 text-[11px] text-stone-400">{i.district}</span>}
                    {i.landmark && i.landmark !== i.district && <span className="chip px-2 py-0.5 text-[11px] text-stone-400">near {i.landmark}</span>}
                  </div>
                  <p className={`text-[13px] leading-relaxed text-stone-300 ${expanded ? "" : "line-clamp-2"}`}>{i.content}</p>
                  {i.content && i.content.length > 140 && (
                    <button onClick={() => setOpen(expanded ? null : i.id)} className="mt-1 text-xs text-vms-300 hover:underline">
                      {expanded ? "Show less" : "Read full notice"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* -------------------------------- journey ------------------------------- */

interface JourneyPayload { readings: JourneyReading[]; capturedAt: string | null }

const REGION_ORDER = ["Hong Kong Island", "Kowloon", "New Territories", "Speed panel sites"];

export function JourneyPanel({ poll, now }: { poll: PollState<JourneyPayload>; now: number }) {
  const [harbourOnly, setHarbourOnly] = useState(false);
  const [region, setRegion] = useState("all");

  const readings = useMemo(() => {
    let r = poll.data?.readings ?? [];
    if (harbourOnly) r = r.filter((x) => ["CH", "EH", "WH"].includes(x.destinationCode));
    if (region !== "all") r = r.filter((x) => x.region === region);
    return [...r].sort((a, b) => b.minutes - a.minutes);
  }, [poll.data, harbourOnly, region]);

  const counts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const r of poll.data?.readings ?? []) c[r.colour]++;
    return c;
  }, [poll.data]);

  return (
    <section>
      <SectionHead
        kicker="TD · Journey time indicators"
        title="Journey times 行車時間"
        blurb="Drive-time estimates from TD sign sites to tunnel exits and NT destinations. Site and destination names follow TD and HKeMobility wording, and the colour chips are TD's own codes."
        right={<FeedNote updatedAt={poll.updatedAt} label="LIVE" />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : poll.data && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((c) => (
              <div key={c} className="card flex items-center gap-3 px-4 py-3">
                <span className={`font-gmono text-2xl font-bold ${c === 1 ? "text-go-400" : c === 2 ? "text-slow-400" : "text-bad-400"}`}>
                  {counts[c]}
                </span>
                <span className="text-xs text-stone-400">routes<br />{COLOUR_LABEL[c].label.toLowerCase()}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label="Origin region">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
                <option value="all">All regions</option>
                {REGION_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <label className="chip flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-stone-300">
              <input type="checkbox" checked={harbourOnly} onChange={(e) => setHarbourOnly(e.target.checked)} className="accent-vms-400" />
              Harbour crossings only
            </label>
            {poll.data.capturedAt && (
              <span className="font-gmono pb-2 text-[11px] text-stone-500">
                TD capture {hkTime(poll.data.capturedAt)} · {ago(poll.data.capturedAt, now)}
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {readings.map((r, idx) => {
              const tone: Tone = r.colour === 1 ? "green" : r.colour === 2 ? "amber" : "red";
              return (
                <div key={`${r.origin}-${r.destinationCode}-${idx}`} className="card flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-white" title={`${r.originName} to ${r.destination}`}>
                      {r.destination}
                    </div>
                    <div className="truncate text-[11px] text-stone-400">from {r.originName}</div>
                    <div className="font-gmono text-[10px] uppercase tracking-wider text-stone-600">{r.direction} · {r.origin}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-gmono text-xl font-bold text-white">{r.minutes}<span className="text-xs font-normal text-stone-500"> min</span></div>
                    <ToneBadge tone={tone}>{COLOUR_LABEL[r.colour].label}</ToneBadge>
                  </div>
                </div>
              );
            })}
          </div>
          {readings.length === 0 && <div className="card p-6 text-center text-sm text-stone-400">Nothing under these filters.</div>}
        </>
      )}
    </section>
  );
}
