"use client";

import { useMemo, useState } from "react";
import type { Camera } from "@/lib/td";
import { useLocale } from "@/lib/i18n";
import {
  FeedNote, Field, PanelError, SectionHead, Skeleton, StatusLine,
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
  const { t } = useLocale();
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
        kicker={t.cameras.kicker}
        title={t.cameras.title}
        blurb={t.cameras.blurb}
        right={<span className="flex items-center gap-3"><FeedNote updatedAt={poll.updatedAt} label={t.cameras.stills} />
          <button onClick={onBust} className="rounded-lg border border-hairline px-3 py-1.5 text-xs text-accent transition hover:bg-wash">{t.cameras.reload}</button></span>}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Field label={t.common.region}>
              <select value={region} onChange={(e) => { setRegion(e.target.value); setDistrict("all"); setPage(0); }} className={inputCls}>
                <option value="all">{t.common.allRegions}</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={t.common.district}>
              <select value={district} onChange={(e) => { setDistrict(e.target.value); setPage(0); }} className={inputCls}>
                <option value="all">{t.common.allDistricts}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label={t.cameras.searchLabel(list.length)} grow>
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t.cameras.searchPh} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {view.map((c) => (
              <button key={c.key} onClick={() => setFocus(c)} className="group text-left">
                <div className="overflow-hidden rounded-lg border border-hairline bg-wash">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bust(c.url, bustToken)} alt={c.description} loading="lazy"
                    className="aspect-[4/3] h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.25"; }} />
                </div>
                <div className="mt-1.5 truncate text-[13px] leading-snug text-ink">{c.description}</div>
                <div className="type-data text-muted">{c.key}</div>
              </button>
            ))}
          </div>
          {list.length === 0 && <p className="mt-2 border-y border-hairline py-8 text-center text-sm text-muted">{t.cameras.noMatch}</p>}
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-hairline px-3 py-1.5 text-xs text-ink disabled:opacity-40">{t.cameras.prev}</button>
            <span className="type-data text-muted">{t.cameras.page(page + 1, pages)}</span>
            <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-hairline px-3 py-1.5 text-xs text-ink disabled:opacity-40">{t.cameras.next}</button>
          </div>
        </>
      )}
      {focus && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4" onClick={() => setFocus(null)}>
          <div className="card w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bust(focus.url, bustToken)} alt={focus.description} className="max-h-[60vh] w-full bg-wash object-contain" />
            <div className="flex flex-wrap items-baseline gap-2 px-5 py-4">
              <span className="type-data text-accent">{focus.key}</span>
              <span className="text-sm font-semibold text-ink">{focus.description}</span>
              <span className="type-data ml-auto text-muted">{focus.region} · {focus.district} · {focus.lat.toFixed(4)}, {focus.lng.toFixed(4)}</span>
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
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const statusName = (s: DetectorPoint["status"]) =>
    s === "congested" ? t.detectors.congested : s === "slow" ? t.detectors.slow : t.detectors.smooth;

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
        kicker={t.detectors.kicker}
        title={t.detectors.title}
        blurb={t.detectors.blurb}
        right={<FeedNote updatedAt={poll.updatedAt} label={t.common.live} />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : poll.data && (
        <>
          <div className="type-data mb-5 flex flex-wrap gap-x-5 gap-y-1 text-muted">
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-bad align-middle" />{dist.congested} {t.detectors.congested}</span>
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" />{dist.slow} {t.detectors.slow}</span>
            <span><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" />{dist.smooth} {t.detectors.smooth}</span>
            <span className="ml-auto text-muted">{t.detectors.window(poll.data.window.date, poll.data.window.from, poll.data.window.to)}</span>
          </div>
          <div className="mb-5 flex flex-wrap gap-3">
            <Field label={t.detectors.searchLabel} grow>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.detectors.searchPh} className={inputCls} />
            </Field>
            <Field label={t.common.status}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="all">{t.common.all}</option>
                <option value="congested">{t.detectors.optCongestedFirst}</option>
                <option value="slow">{t.detectors.slow}</option>
                <option value="smooth">{t.detectors.smooth}</option>
              </select>
            </Field>
          </div>
          <div className="overflow-x-auto border-t border-hairline">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="type-eyebrow border-b border-hairline text-muted">
                  <th className="py-2.5 pr-2 font-normal">{t.detectors.thRoad}</th>
                  <th className="hidden px-2 py-2.5 font-normal sm:table-cell">{t.detectors.thDistrict}</th>
                  <th className="px-2 py-2.5 text-right font-normal">{t.detectors.thSpeed}</th>
                  <th className="hidden px-2 py-2.5 text-right font-normal md:table-cell">{t.detectors.thVolume}</th>
                  <th className="hidden px-2 py-2.5 text-right font-normal md:table-cell">{t.detectors.thOcc}</th>
                  <th className="py-2.5 pl-2 text-right font-normal">{t.detectors.thStatus}</th>
                </tr>
              </thead>
              <tbody>
                {slowest.map((p) => (
                  <tr key={p.id} className="row-hover border-b border-hairline">
                    <td className="py-2.5 pr-2">
                      <div className="font-medium text-ink">{p.road}</div>
                      <div className="type-data text-muted">{p.id} · {p.lanes} lanes{p.direction ? ` · ${p.direction}` : ""}</div>
                    </td>
                    <td className="hidden px-2 py-2.5 text-muted sm:table-cell">{p.district}</td>
                    <td className="type-data px-2 py-2.5 text-left text-[15px] font-medium tabular-nums text-ink">{p.avgSpeed}<span className="ml-0.5 text-[11px] font-normal text-muted">{t.overview.kmh}</span></td>
                    <td className="type-data hidden px-2 py-2.5 text-right text-muted md:table-cell">{p.volume}</td>
                    <td className="type-data hidden px-2 py-2.5 text-right text-muted md:table-cell">{p.maxOcc}%</td>
                    <td className="py-2.5 pl-2 text-right"><StatusLine tone={STATUS_TONE[p.status]}>{statusName(p.status)}</StatusLine></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="type-data mt-2 text-muted">{t.common.showingSlowest(slowest.length, points.length)}</p>
        </>
      )}
    </section>
  );
}
