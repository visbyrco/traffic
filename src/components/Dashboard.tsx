"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Incident, JourneyReading } from "@/lib/td";
import { IncidentsPanel, JourneyPanel } from "./panels-traffic";
import { CamerasPanel, DetectorsPanel, type DetectorPoint } from "./panels-roads";
import { BusesPanel, ParkingPanel, RoadworksPanel } from "./panels-city";
import type { Camera, CarPark, Roadwork } from "@/lib/td";
import { FeedNote, StatusLine, ago, usePoll } from "./ui";

const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => <div className="ledger flex h-[62vh] min-h-[420px] items-center justify-center text-sm text-muted">Loading map</div>,
});

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "incidents", label: "Incidents" },
  { id: "journey", label: "Journey times" },
  { id: "cameras", label: "Cameras" },
  { id: "speeds", label: "Speed map" },
  { id: "parking", label: "Parking" },
  { id: "roadworks", label: "Roadworks" },
  { id: "buses", label: "Buses" },
  { id: "map", label: "Live map" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function hktClock(): string {
  return new Date().toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function Clock() {
  const [clock, setClock] = useState(hktClock);
  useEffect(() => {
    const t = setInterval(() => setClock(hktClock()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="type-data shrink-0 text-muted">
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" aria-hidden />
      {clock} HKT
    </span>
  );
}

const PANELS = [
  { n: 1, code: "sj1", label: "Tai Po Rd · Sha Tin · SB near Racecourse" },
  { n: 2, code: "sj2", label: "Tate's Cairn Hwy · SB near Shek Mun" },
  { n: 3, code: "sj3", label: "Tolo Hwy · SB near Science Park" },
  { n: 4, code: "sj4", label: "New Territories panel 4" },
  { n: 5, code: "sj5", label: "New Territories panel 5" },
];

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  // Ticks every 30s for relative times. The HKT clock above keeps its own 1s timer.
  const [now, setNow] = useState(() => Date.now());
  // Cache-bust token for CCTV stills. Starts at a constant so SSR and the
  // first client render agree; "Reload frames" bumps it to Date.now().
  const [bustToken, setBustToken] = useState(1);

  const incidents = usePoll<{ incidents: Incident[]; count: number }>("/api/incidents", 60000);
  const journey = usePoll<{ readings: JourneyReading[]; capturedAt: string | null }>("/api/journey", 120000);
  const cameras = usePoll<{ cameras: Camera[]; count: number }>("/api/cameras", 3600000);
  const detectors = usePoll<{ points: DetectorPoint[]; window: { date: string; from: string; to: string } }>("/api/detectors", 120000);
  const parking = usePoll<{ parks: CarPark[] }>("/api/parking", 90000);
  const roadworks = usePoll<{ roadworks: Roadwork[]; count: number }>("/api/roadworks", 300000);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const kpis = useMemo(() => {
    const pts = detectors.data?.points ?? [];
    const slow = pts.filter((p) => p.status !== "smooth").length;
    const harbour = (journey.data?.readings ?? []).filter((r) => ["CH", "EH", "WH"].includes(r.destinationCode));
    const worst = harbour.reduce<JourneyReading | null>((a, b) => (!a || b.minutes > a.minutes ? b : a), null);
    const full = (parking.data?.parks ?? []).filter((p) => {
      const v = p.vacancies.find((x) => x.vehicle === "privateCar") ?? p.vacancies.find((x) => x.vehicle === "P");
      return v && v.vacancy <= 0;
    }).length;
    return {
      active: incidents.data?.count ?? null,
      slow, slowTotal: pts.length || null,
      worst, full,
    };
  }, [incidents.data, detectors.data, journey.data, parking.data]);

  const latestIncident = incidents.data?.incidents?.[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
      {/* compact Visbyr top bar */}
      <header className="flex items-center gap-3 border-b border-hairline py-4">
        <h1 className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Visbyr Traffic <span className="font-normal text-muted">香港即時交通</span>
        </h1>
        <span className="type-eyebrow hidden text-muted md:inline">Live TD open data</span>
        <span className="ml-auto"><Clock /></span>
      </header>

      {/* alert strip: latest incident, static */}
      {latestIncident && (
        <button
          onClick={() => setTab("incidents")}
          className="row-hover mt-4 flex w-full items-center gap-3 border-b border-hairline pb-3 text-left"
        >
          <StatusLine tone={/NEW/.test(latestIncident.status.toUpperCase()) ? "red" : "amber"}>
            {/NEW/.test(latestIncident.status.toUpperCase()) ? "New" : latestIncident.status || "Latest"}
          </StatusLine>
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {latestIncident.location || latestIncident.heading}
            {latestIncident.direction ? ` → ${latestIncident.direction}` : ""}
          </span>
          <span className="type-data shrink-0 text-muted">{ago(latestIncident.announcedAt, now)}</span>
          <span className="shrink-0 text-sm text-faint">→</span>
        </button>
      )}

      {/* tabs: plain text links */}
      <nav className="sticky top-0 z-40 -mx-5 mb-8 overflow-x-auto border-b border-hairline bg-background/95 px-5 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex gap-6">
          {TABS.map((t) => {
            const badge =
              t.id === "incidents" && incidents.data ? incidents.data.count :
              t.id === "roadworks" && roadworks.data ? roadworks.data.count :
              t.id === "cameras" && cameras.data ? cameras.data.count : null;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`min-h-11 shrink-0 border-b-2 px-0.5 pb-2 pt-3 text-[15px] transition ${
                  active
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent font-normal text-muted hover:text-ink"
                }`}>
                {t.label}
                {badge != null && <span className="type-data ml-1.5 opacity-70">{badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "overview" && (
        <div className="space-y-12">
          {/* network at a glance: single ledger, four rows */}
          <section>
            <div className="type-eyebrow mb-3 text-muted">Network at a glance</div>
            <div className="ledger divide-y divide-hairline">
              <KpiRow label="Active incidents" sub="TD special traffic news" value={kpis.active != null ? String(kpis.active) : "…"} tone={kpis.active ? "red" : "green"} onClick={() => setTab("incidents")} />
              <KpiRow label="Slow detectors" sub={kpis.slowTotal ? `of ${kpis.slowTotal} monitored` : "Detector network"} value={kpis.slowTotal ? `${kpis.slow} / ${kpis.slowTotal}` : kpis.slow ? String(kpis.slow) : "…"} tone={kpis.slow ? "amber" : "green"} onClick={() => setTab("speeds")} />
              <KpiRow label="Worst harbour crossing" sub={kpis.worst ? `${kpis.worst.origin} → ${kpis.worst.destination}` : "Journey indicators"} value={kpis.worst ? `${kpis.worst.minutes} min` : "…"} tone={kpis.worst && kpis.worst.minutes >= 20 ? "red" : kpis.worst ? "amber" : "green"} onClick={() => setTab("journey")} />
              <KpiRow label="Car parks full" sub="Private-car spaces" value={parking.data ? String(kpis.full) : "…"} tone={kpis.full ? "amber" : "green"} onClick={() => setTab("parking")} />
            </div>
          </section>

          {/* what needs attention + slowest */}
          <div className="grid gap-12 lg:grid-cols-2">
            <section>
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">Latest on the wire</h3>
                <button onClick={() => setTab("incidents")} className="min-h-11 text-sm text-accent hover:underline">View all</button>
              </div>
              <div className="border-t border-hairline">
                {(incidents.data?.incidents ?? []).slice(0, 3).map((i) => (
                  <div key={i.id} className="border-b border-hairline py-3.5">
                    <div className="flex items-center gap-2">
                      <StatusLine tone={/NEW/.test(i.status.toUpperCase()) ? "red" : "amber"}>{i.status || "Notice"}</StatusLine>
                      <span className="type-data ml-auto text-muted">{ago(i.announcedAt, now)}</span>
                    </div>
                    <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink">{i.location || i.heading}{i.direction ? ` → ${i.direction}` : ""}</p>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted">{i.content}</p>
                  </div>
                ))}
                {!incidents.data && <p className="border-b border-hairline py-4 text-sm text-muted">Loading</p>}
              </div>
            </section>
            <section>
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">Slowest detectors</h3>
                <button onClick={() => setTab("speeds")} className="min-h-11 text-sm text-accent hover:underline">Full table</button>
              </div>
              <div className="border-t border-hairline">
                {[...(detectors.data?.points ?? [])].sort((a, b) => a.avgSpeed - b.avgSpeed).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-baseline gap-4 border-b border-hairline py-3">
                    <span className="type-data w-24 shrink-0 text-[15px] font-medium tabular-nums text-ink">{p.avgSpeed}<span className="ml-1 text-[11px] font-normal text-muted">km/h</span></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] text-ink">{p.road}</div>
                      <div className="type-data truncate text-muted">{p.district} · {p.id}</div>
                    </div>
                    <span className={`status-dot shrink-0 self-center ${p.avgSpeed < 25 ? "bg-bad" : p.avgSpeed < 50 ? "bg-warn" : "bg-good"}`} aria-hidden />
                  </div>
                ))}
                {!detectors.data && <p className="border-b border-hairline py-4 text-sm text-muted">Loading</p>}
              </div>
            </section>
          </div>

          {/* gantry boards: plain figures, black boards are the real VMS */}
          <section>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">What the gantry signs say</h3>
              <FeedNote updatedAt={detectors.updatedAt} label="TD IMAGES" />
            </div>
            <p className="mb-4 text-sm text-muted">The Sha Tin approach boards, pulled straight from the TD image feed.</p>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {PANELS.map((p) => (
                <figure key={p.code}>
                  <div className="overflow-hidden rounded-md border border-hairline bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://resource.data.one.gov.hk/td/jss/${p.code}.en.png?t=${bustToken}`} alt={p.label} loading="lazy" className="aspect-[4/5] w-full object-contain" />
                  </div>
                  <figcaption className="type-data mt-1.5 leading-snug text-muted">{p.label}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* quick links: text rows, not cards */}
          <section>
            <div className="type-eyebrow mb-1 text-muted">Go deeper</div>
            <div className="border-t border-hairline">
              <QuickRow label="CCTV stills" desc="A thousand roadside cameras" onClick={() => setTab("cameras")} />
              <QuickRow label="Car parks" desc="Live vacancies" onClick={() => setTab("parking")} />
              <QuickRow label="Bus ETAs" desc="KMB · Citybus · GMB" onClick={() => setTab("buses")} />
              <QuickRow label="Live map" desc="Detectors and works" onClick={() => setTab("map")} />
            </div>
          </section>
        </div>
      )}

      {tab === "incidents" && <IncidentsPanel poll={incidents} now={now} />}
      {tab === "journey" && <JourneyPanel poll={journey} now={now} />}
      {tab === "cameras" && <CamerasPanel poll={cameras} bustToken={bustToken} onBust={() => setBustToken(Date.now())} />}
      {tab === "speeds" && <DetectorsPanel poll={detectors} />}
      {tab === "parking" && <ParkingPanel poll={parking} now={now} />}
      {tab === "roadworks" && <RoadworksPanel poll={roadworks} />}
      {tab === "buses" && <BusesPanel now={now} />}
      {tab === "map" && (
        <section>
          <div className="card overflow-hidden">
            <TrafficMap
              cameras={cameras.data?.cameras ?? []}
              detectors={detectors.data?.points ?? []}
              parks={parking.data?.parks ?? []}
              roadworks={roadworks.data?.roadworks ?? []}
            />
          </div>
          <p className="type-data mt-2 text-muted">Toggle layers top-left. Cameras and car parks are capped for performance; their tabs hold the full searchable lists.</p>
        </section>
      )}
    </div>
  );
}

function KpiRow({ label, value, sub, tone, onClick }: {
  label: string; value: string; sub: string;
  tone: "red" | "green" | "amber" | "signal"; onClick: () => void;
}) {
  const dot = tone === "red" ? "bg-bad" : tone === "amber" ? "bg-warn" : tone === "signal" ? "bg-accent" : "bg-good";
  return (
    <button onClick={onClick} className="row-hover group flex min-h-11 w-full items-center gap-4 px-4 py-3 text-left sm:px-5">
      <span className={`status-dot ${dot}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        <span className="type-data block truncate text-muted">{sub}</span>
      </span>
      <span className="font-display shrink-0 text-[26px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-ink">{value}</span>
      <span className="shrink-0 text-sm text-faint">→</span>
    </button>
  );
}

function QuickRow({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="row-hover group flex min-h-11 w-full items-center gap-3 border-b border-hairline py-2.5 text-left">
      <span className="text-[15px] font-medium text-ink group-hover:text-accent">{label}</span>
      <span className="type-data text-muted">{desc}</span>
      <span className="ml-auto text-sm text-faint">→</span>
    </button>
  );
}
