"use client";

import { useMemo, useState } from "react";
import type { Incident, JourneyReading } from "@/lib/td";
import { COLOUR_LABEL } from "@/lib/td";
import {
  FeedNote, Field, PanelError, SectionHead, Skeleton, StatusLine,
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
        title="Incidents and closures"
        blurb="Accidents, lane closures and special arrangements from the Transport Department. Refreshes about every minute."
        right={<FeedNote updatedAt={poll.updatedAt} label="LIVE" />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={5} /> : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
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
          {list.length === 0 && <p className="border-y border-hairline py-8 text-center text-sm text-muted">No incidents match.</p>}
          <div className="border-t border-hairline">
            {list.map((i, idx) => {
              const t = incidentTone(i.status);
              const expanded = open === i.id;
              return (
                <article key={`${i.id}-${idx}`} className="border-b border-hairline py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusLine tone={t}>{i.status || i.heading}</StatusLine>
                    {i.detail && <span className="type-data text-muted">{i.detail}</span>}
                    <span className="type-data ml-auto text-muted" title={i.announcedAt}>
                      {hkTime(i.announcedAt)} · {ago(i.announcedAt, now)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">
                    {i.location || i.heading}
                    {i.direction && <span className="font-normal text-muted"> → {i.direction}</span>}
                  </h3>
                  {(i.district || i.landmark) && (
                    <div className="type-data mt-0.5 text-muted">
                      {[i.district, i.landmark && i.landmark !== i.district ? `near ${i.landmark}` : null].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <p className={`mt-1 text-[14px] leading-relaxed text-muted ${expanded ? "" : "line-clamp-2"}`}>{i.content}</p>
                  {i.content && i.content.length > 140 && (
                    <button onClick={() => setOpen(expanded ? null : i.id)} className="mt-1 text-[13px] text-accent hover:underline">
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
        title="Journey times"
        blurb="Drive-time estimates from TD sign sites to tunnel exits and NT destinations. Site and destination names follow TD and HKeMobility wording."
        right={<FeedNote updatedAt={poll.updatedAt} label="LIVE" />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : poll.data && (
        <>
          <div className="type-data mb-5 flex flex-wrap gap-x-5 gap-y-1 text-muted">
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" />{counts[1]} smooth</span>
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" />{counts[2]} slow</span>
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-bad align-middle" />{counts[3]} congested</span>
          </div>
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <Field label="Origin region">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
                <option value="all">All regions</option>
                {REGION_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-[13px] text-muted">
              <input type="checkbox" checked={harbourOnly} onChange={(e) => setHarbourOnly(e.target.checked)} className="accent-accent" />
              Harbour crossings only
            </label>
            {poll.data.capturedAt && (
              <span className="type-data pb-2 text-muted">
                TD capture {hkTime(poll.data.capturedAt)} · {ago(poll.data.capturedAt, now)}
              </span>
            )}
          </div>
          <div className="border-t border-hairline">
            {readings.map((r, idx) => {
              const tone: Tone = r.colour === 1 ? "green" : r.colour === 2 ? "amber" : "red";
              return (
                <div key={`${r.origin}-${r.destinationCode}-${idx}`} className="flex items-baseline gap-4 border-b border-hairline py-3">
                  <span className={`status-dot shrink-0 self-center ${tone === "green" ? "bg-good" : tone === "amber" ? "bg-warn" : "bg-bad"}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-ink" title={`${r.originName} to ${r.destination}`}>
                      {r.destination}
                    </div>
                    <div className="type-data truncate text-muted">from {r.originName} · {r.direction}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-xl font-semibold tabular-nums text-ink">{r.minutes}<span className="type-data ml-1 font-normal text-muted">min</span></div>
                    <div className="type-data text-muted">{COLOUR_LABEL[r.colour].label}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {readings.length === 0 && <p className="border-b border-hairline py-8 text-center text-sm text-muted">Nothing under these filters.</p>}
        </>
      )}
    </section>
  );
}
