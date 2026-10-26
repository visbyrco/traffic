"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Incident, JourneyReading } from "@/lib/td";
import { districtDisplay, journeyDisplay } from "@/lib/td";
import { LOCALES, LocaleProvider, intlLocale, pick, useLocale, type Locale } from "@/lib/i18n";
import { IncidentsPanel, JourneyPanel } from "./panels-traffic";
import { CamerasPanel, DetectorsPanel, type DetectorPoint } from "./panels-roads";
import { BusesPanel, ParkingPanel, RoadworksPanel } from "./panels-city";
import type { Camera, CarPark, Roadwork } from "@/lib/td";
import { FeedNote, StatusLine, ago, usePoll } from "./ui";

function MapLoading() {
  const { t } = useLocale();
  return <div className="ledger flex h-[62vh] min-h-[420px] items-center justify-center text-sm text-muted">{t.overview.loadingMap}</div>;
}

const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

type Tab = "overview" | "incidents" | "journey" | "cameras" | "speeds" | "parking" | "roadworks" | "buses" | "map";

const SOURCES = [
  "hk-td-tis_19-special-traffic-news-v2",
  "hk-td-sm_8-journey-time-indicators-v2",
  "hk-td-tis_2-traffic-snapshot-images",
  "hk-td-sm_9-speed-map-panels-v2",
  "hk-td-sm_4-traffic-data-strategic-major-roads",
  "hk-dpo-datagovhk1-carpark-info-vacancy",
  "hk-td-tis_18-roadworks-location",
  "hk-td-tis_21-etakmb",
  "ctb-eta-transport-realtime-eta",
  "hk-td-sm_7-real-time-arrival-data-of-gmb",
];

function hktClock(locale: Locale): string {
  return new Date().toLocaleString(intlLocale(locale), { timeZone: "Asia/Hong_Kong", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function Clock() {
  const { locale } = useLocale();
  // Gated on mount: SSR and the first client paint render the same
  // placeholder, so the per-second time string can't cause a hydration
  // mismatch when the second rolls over between the two.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="type-data shrink-0 text-muted">
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" aria-hidden />
      {tick === 0 ? "" : hktClock(locale)} HKT
    </span>
  );
}

function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-hairline" role="group" aria-label="Language 語言">
      {LOCALES.map((l) => (
        <button
          key={l.id}
          onClick={() => setLocale(l.id)}
          aria-pressed={locale === l.id}
          className={`type-data px-2.5 py-1 transition ${locale === l.id ? "bg-ink font-medium text-background" : "text-muted hover:text-ink"}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

const PANEL_CODES = ["sj1", "sj2", "sj3", "sj4", "sj5"];

function DashboardInner() {
  const { locale, t } = useLocale();
  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: t.tabs.overview },
    { id: "incidents", label: t.tabs.incidents },
    { id: "journey", label: t.tabs.journey },
    { id: "cameras", label: t.tabs.cameras },
    { id: "speeds", label: t.tabs.speeds },
    { id: "parking", label: t.tabs.parking },
    { id: "roadworks", label: t.tabs.roadworks },
    { id: "buses", label: t.tabs.buses },
    { id: "map", label: t.tabs.map },
  ];
  const [tab, setTab] = useState<Tab>("overview");
  const [now, setNow] = useState(() => Date.now());
  const [bustToken, setBustToken] = useState(1);

  const incidents = usePoll<{ incidents: Incident[]; count: number }>("/api/incidents", 60000);
  const journey = usePoll<{ readings: JourneyReading[]; capturedAt: string | null }>("/api/journey", 120000);
  const cameras = usePoll<{ cameras: Camera[]; count: number }>(`/api/cameras?lang=${locale}`, 3600000);
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
  const imgLang = locale === "zh" ? "tc" : "en";
  const worstD = kpis.worst ? journeyDisplay(kpis.worst, locale) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
      {/* compact Visbyr top bar */}
      <header className="flex items-center gap-3 border-b border-hairline py-4">
        <h1 className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Visbyr Traffic <span className="font-normal text-muted">香港即時交通</span>
        </h1>
        <span className="type-eyebrow hidden text-muted md:inline">{t.headerTagline}</span>
        <span className="ml-auto flex items-center gap-2"><LocaleToggle /><Clock /></span>
      </header>

      {/* alert strip: latest incident, static */}
      {latestIncident && (
        <button
          onClick={() => setTab("incidents")}
          className="row-hover mt-4 flex w-full items-center gap-3 border-b border-hairline pb-3 text-left"
        >
          <StatusLine tone={/NEW/.test(latestIncident.status.toUpperCase()) ? "red" : "amber"}>
            {/NEW/.test(latestIncident.status.toUpperCase()) ? t.alertNew : pick(latestIncident.status, latestIncident.statusTc, locale) || t.alertLatest}
          </StatusLine>
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {pick(latestIncident.location || latestIncident.heading, latestIncident.locationTc || latestIncident.headingTc, locale)}
            {pick(latestIncident.direction, latestIncident.directionTc, locale) ? ` → ${pick(latestIncident.direction, latestIncident.directionTc, locale)}` : ""}
          </span>
          <span className="type-data shrink-0 text-muted">{ago(latestIncident.announcedAt, now, locale)}</span>
          <span className="shrink-0 text-sm text-faint">→</span>
        </button>
      )}

      {/* tabs: plain text links */}
      <nav className="sticky top-0 z-40 -mx-5 mb-8 overflow-x-auto border-b border-hairline bg-background/95 px-5 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex gap-6">
          {TABS.map((tb) => {
            const badge =
              tb.id === "incidents" && incidents.data ? incidents.data.count :
              tb.id === "roadworks" && roadworks.data ? roadworks.data.count :
              tb.id === "cameras" && cameras.data ? cameras.data.count : null;
            const active = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                className={`min-h-11 shrink-0 border-b-2 px-0.5 pb-2 pt-3 text-[15px] transition ${
                  active
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent font-normal text-muted hover:text-ink"
                }`}>
                {tb.label}
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
            <div className="type-eyebrow mb-3 text-muted">{t.overview.glance}</div>
            <div className="ledger divide-y divide-hairline">
              <KpiRow label={t.overview.kpiActive} sub={t.overview.kpiActiveSub} value={kpis.active != null ? String(kpis.active) : "…"} tone={kpis.active ? "red" : "green"} onClick={() => setTab("incidents")} />
              <KpiRow label={t.overview.kpiSlow} sub={kpis.slowTotal ? t.overview.kpiSlowSubAll(kpis.slowTotal) : t.overview.kpiSlowSub} value={kpis.slowTotal ? `${kpis.slow} / ${kpis.slowTotal}` : kpis.slow ? String(kpis.slow) : "…"} tone={kpis.slow ? "amber" : "green"} onClick={() => setTab("speeds")} />
              <KpiRow label={t.overview.kpiWorst} sub={kpis.worst && worstD ? `${kpis.worst.origin} → ${worstD.destination}` : t.overview.kpiWorstSub} value={kpis.worst ? `${kpis.worst.minutes} ${t.journey.min}` : "…"} tone={kpis.worst && kpis.worst.minutes >= 20 ? "red" : kpis.worst ? "amber" : "green"} onClick={() => setTab("journey")} />
              <KpiRow label={t.overview.kpiFull} sub={t.overview.kpiFullSub} value={parking.data ? String(kpis.full) : "…"} tone={kpis.full ? "amber" : "green"} onClick={() => setTab("parking")} />
            </div>
          </section>

          {/* what needs attention + slowest */}
          <div className="grid gap-12 lg:grid-cols-2">
            <section>
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{t.overview.latestWire}</h3>
                <button onClick={() => setTab("incidents")} className="min-h-11 text-sm text-accent hover:underline">{t.overview.viewAll}</button>
              </div>
              <div className="border-t border-hairline">
                {(incidents.data?.incidents ?? []).slice(0, 3).map((i) => (
                  <div key={i.id} className="border-b border-hairline py-3.5">
                    <div className="flex items-center gap-2">
                      <StatusLine tone={/NEW/.test(i.status.toUpperCase()) ? "red" : "amber"}>{pick(i.status, i.statusTc, locale) || t.alertLatest}</StatusLine>
                      <span className="type-data ml-auto text-muted">{ago(i.announcedAt, now, locale)}</span>
                    </div>
                    <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink">{pick(i.location || i.heading, i.locationTc || i.headingTc, locale)}{pick(i.direction, i.directionTc, locale) ? ` → ${pick(i.direction, i.directionTc, locale)}` : ""}</p>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted">{pick(i.content, i.contentTc, locale)}</p>
                  </div>
                ))}
                {!incidents.data && <p className="border-b border-hairline py-4 text-sm text-muted">{t.common.loading}</p>}
              </div>
            </section>
            <section>
              <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{t.overview.slowest}</h3>
                <button onClick={() => setTab("speeds")} className="min-h-11 text-sm text-accent hover:underline">{t.overview.fullTable}</button>
              </div>
              <div className="border-t border-hairline">
                {[...(detectors.data?.points ?? [])].sort((a, b) => a.avgSpeed - b.avgSpeed).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-baseline gap-4 border-b border-hairline py-3">
                    <span className="type-data w-24 shrink-0 text-[15px] font-medium tabular-nums text-ink">{p.avgSpeed}<span className="ml-1 text-[11px] font-normal text-muted">{t.overview.kmh}</span></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] text-ink">{p.road}</div>
                      <div className="type-data truncate text-muted">{districtDisplay(p.district, locale)} · {p.id}</div>
                    </div>
                    <span className={`status-dot shrink-0 self-center ${p.avgSpeed < 25 ? "bg-bad" : p.avgSpeed < 50 ? "bg-warn" : "bg-good"}`} aria-hidden />
                  </div>
                ))}
                {!detectors.data && <p className="border-b border-hairline py-4 text-sm text-muted">{t.common.loading}</p>}
              </div>
            </section>
          </div>

          {/* gantry boards: plain figures, black boards are the real VMS */}
          <section>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">{t.overview.gantry}</h3>
              <FeedNote updatedAt={detectors.updatedAt} label={t.common.tdImages} />
            </div>
            <p className="mb-4 text-sm text-muted">{t.overview.gantryBlurb}</p>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {PANEL_CODES.map((code, i) => (
                <figure key={code}>
                  <div className="overflow-hidden rounded-md border border-hairline bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://resource.data.one.gov.hk/td/jss/${code}.${imgLang}.png?t=${bustToken}`} alt={t.overview.panels[i]} loading="lazy" className="aspect-[4/5] w-full object-contain" />
                  </div>
                  <figcaption className="type-data mt-1.5 leading-snug text-muted">{t.overview.panels[i]}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* quick links: text rows, not cards */}
          <section>
            <div className="type-eyebrow mb-1 text-muted">{t.overview.deeper}</div>
            <div className="border-t border-hairline">
              <QuickRow label={t.overview.quickCctv} desc={t.overview.quickCctvDesc} onClick={() => setTab("cameras")} />
              <QuickRow label={t.overview.quickParks} desc={t.overview.quickParksDesc} onClick={() => setTab("parking")} />
              <QuickRow label={t.overview.quickBuses} desc={t.overview.quickBusesDesc} onClick={() => setTab("buses")} />
              <QuickRow label={t.overview.quickMap} desc={t.overview.quickMapDesc} onClick={() => setTab("map")} />
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
          <p className="type-data mt-2 text-muted">{t.overview.mapNote}</p>
        </section>
      )}

      <footer className="mt-16 border-t border-hairline">
        <div className="py-10">
          <div className="type-eyebrow text-muted">{t.footer.kicker}</div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{t.footer.blurb}</p>
          <ul className="mt-5 border-t border-hairline">
            {SOURCES.map((id, i) => (
              <li key={id} className="border-b border-hairline">
                <a
                  href={`https://data.gov.hk/en-data/dataset/${id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="type-data row-hover flex flex-wrap gap-x-3 py-2 text-muted hover:text-accent"
                  title={id}
                >
                  <span className="font-medium text-ink">{t.footer.uses[i]}</span>
                  <span className="truncate">{id}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="type-data mt-6 text-muted">{t.footer.signoff}</p>
        </div>
      </footer>
    </div>
  );
}

export default function Dashboard() {
  return (
    <LocaleProvider>
      <DashboardInner />
    </LocaleProvider>
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
