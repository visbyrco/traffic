"use client";

import { useMemo, useState } from "react";
import type { Incident, JourneyReading } from "@/lib/td";
import { COLOUR_LABEL } from "@/lib/td";
import { pick, useLocale, type Locale } from "@/lib/i18n";
import {
  FeedNote, Field, PanelError, SectionHead, Skeleton, StatusLine,
  ago, hkTime, inputCls, type PollState, type Tone,
} from "./ui";

/* ------------------------------- incidents ------------------------------ */

interface IncidentPayload { incidents: Incident[]; count: number }

function incidentTone(statusEn: string): Tone {
  const s = statusEn.toUpperCase();
  if (/CLEAR|END|NORMAL|RESUM/.test(s)) return "green";
  if (/NEW/.test(s)) return "red";
  return "amber";
}

const loc = (i: Incident, locale: Locale) => pick(i.location || i.heading, i.locationTc || i.headingTc, locale);
const dir = (i: Incident, locale: Locale) => pick(i.direction, i.directionTc, locale);
const statusText = (i: Incident, locale: Locale) => pick(i.status, i.statusTc, locale);
const contentText = (i: Incident, locale: Locale) => pick(i.content, i.contentTc, locale);

export function incidentSearchText(i: Incident): string {
  return [i.location, i.locationTc, i.content, i.contentTc, i.district, i.districtTc, i.heading, i.headingTc, i.direction, i.directionTc, i.detail, i.detailTc]
    .join(" ");
}

export function IncidentsPanel({ poll, now }: { poll: PollState<IncidentPayload>; now: number }) {
  const { locale, t } = useLocale();
  const [q, setQ] = useState("");
  const [tone, setTone] = useState<"all" | Tone>("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const items = poll.data?.incidents ?? [];
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (tone !== "all" && incidentTone(i.status) !== tone) return false;
      if (!needle) return true;
      return incidentSearchText(i).toLowerCase().includes(needle);
    });
  }, [poll.data, q, tone]);

  return (
    <section>
      <SectionHead
        kicker={t.incidents.kicker}
        title={t.incidents.title}
        blurb={t.incidents.blurb}
        right={<FeedNote updatedAt={poll.updatedAt} label={t.common.live} />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={5} /> : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Field label={t.incidents.searchLabel} grow>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.incidents.searchPh} className={inputCls} />
            </Field>
            <Field label={t.common.status}>
              <select value={tone} onChange={(e) => setTone(e.target.value as Tone | "all")} className={inputCls}>
                <option value="all">{t.incidents.optAll(poll.data?.count ?? 0)}</option>
                <option value="red">{t.incidents.optNew}</option>
                <option value="amber">{t.incidents.optOngoing}</option>
                <option value="green">{t.incidents.optCleared}</option>
              </select>
            </Field>
          </div>
          {list.length === 0 && <p className="border-y border-hairline py-8 text-center text-sm text-muted">{t.common.noMatch}</p>}
          <div className="border-t border-hairline">
            {list.map((i, idx) => {
              const tn = incidentTone(i.status);
              const expanded = open === i.id;
              const body = contentText(i, locale);
              return (
                <article key={`${i.id}-${idx}`} className="border-b border-hairline py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusLine tone={tn}>{statusText(i, locale) || pick(i.heading, i.headingTc, locale)}</StatusLine>
                    {pick(i.detail, i.detailTc, locale) && <span className="type-data text-muted">{pick(i.detail, i.detailTc, locale)}</span>}
                    <span className="type-data ml-auto text-muted" title={i.announcedAt}>
                      {hkTime(i.announcedAt, locale)} · {ago(i.announcedAt, now, locale)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">
                    {loc(i, locale)}
                    {dir(i, locale) && <span className="font-normal text-muted"> → {dir(i, locale)}</span>}
                  </h3>
                  {(pick(i.district, i.districtTc, locale) || pick(i.landmark, i.landmarkTc, locale)) && (
                    <div className="type-data mt-0.5 text-muted">
                      {[pick(i.district, i.districtTc, locale), pick(i.landmark, i.landmarkTc, locale) && pick(i.landmark, i.landmarkTc, locale) !== pick(i.district, i.districtTc, locale) ? `near ${pick(i.landmark, i.landmarkTc, locale)}` : null].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  <p className={`mt-1 text-[14px] leading-relaxed text-muted ${expanded ? "" : "line-clamp-2"}`}>{body}</p>
                  {body && body.length > 140 && (
                    <button onClick={() => setOpen(expanded ? null : i.id)} className="mt-1 text-[13px] text-accent hover:underline">
                      {expanded ? t.incidents.showLess : t.incidents.readMore}
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

function regionLabel(region: string, locale: Locale): string {
  if (locale !== "zh") return region;
  if (region === "Hong Kong Island") return "港島";
  if (region === "Kowloon") return "九龍";
  if (region === "New Territories") return "新界";
  if (region === "Speed panel sites") return "快拍板地點";
  return region;
}

export function JourneyPanel({ poll, now }: { poll: PollState<JourneyPayload>; now: number }) {
  const { locale, t } = useLocale();
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

  const colourName = (c: 1 | 2 | 3) => c === 1 ? t.journey.smooth : c === 2 ? t.journey.slow : t.journey.congested;

  return (
    <section>
      <SectionHead
        kicker={t.journey.kicker}
        title={t.journey.title}
        blurb={t.journey.blurb}
        right={<FeedNote updatedAt={poll.updatedAt} label={t.common.live} />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : poll.data && (
        <>
          <div className="type-data mb-5 flex flex-wrap gap-x-5 gap-y-1 text-muted">
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" />{counts[1]} {t.journey.smooth}</span>
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" />{counts[2]} {t.journey.slow}</span>
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-bad align-middle" />{counts[3]} {t.journey.congested}</span>
          </div>
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <Field label={t.journey.originRegion}>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
                <option value="all">{t.common.allRegions}</option>
                {REGION_ORDER.map((r) => <option key={r} value={r}>{regionLabel(r, locale)}</option>)}
              </select>
            </Field>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-[13px] text-muted">
              <input type="checkbox" checked={harbourOnly} onChange={(e) => setHarbourOnly(e.target.checked)} className="accent-accent" />
              {t.journey.harbourOnly}
            </label>
            {poll.data.capturedAt && (
              <span className="type-data pb-2 text-muted">
                {t.journey.capture(hkTime(poll.data.capturedAt, locale), ago(poll.data.capturedAt, now, locale))}
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
                    <div className="type-data truncate text-muted">{t.journey.from} {r.originName} · {r.direction}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-xl font-semibold tabular-nums text-ink">{r.minutes}<span className="type-data ml-1 font-normal text-muted">{t.journey.min}</span></div>
                    <div className="type-data text-muted">{colourName(r.colour) ?? COLOUR_LABEL[r.colour].label}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {readings.length === 0 && <p className="border-b border-hairline py-8 text-center text-sm text-muted">{t.common.nothingUnderFilters}</p>}
        </>
      )}
    </section>
  );
}
