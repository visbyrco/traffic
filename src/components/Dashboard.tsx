"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Incident, JourneyReading } from "@/lib/td";
import { IncidentsPanel, JourneyPanel } from "./panels-traffic";
import { CamerasPanel, DetectorsPanel, type DetectorPoint } from "./panels-roads";
import { BusesPanel, ParkingPanel, RoadworksPanel } from "./panels-city";
import type { Camera, CarPark, Roadwork } from "@/lib/td";
import { FeedNote, ToneBadge, ago, usePoll } from "./ui";

const TrafficMap = dynamic(() => import("./TrafficMap"), {
  ssr: false,
  loading: () => <div className="card flex h-[62vh] min-h-[420px] items-center justify-center text-sm text-stone-500">Loading map…</div>,
});

const TABS = [
  { id: "overview", label: "Overview", zh: "總覽" },
  { id: "incidents", label: "Incidents", zh: "事故" },
  { id: "journey", label: "Journey times", zh: "行車時間" },
  { id: "cameras", label: "Cameras", zh: "交通快拍" },
  { id: "speeds", label: "Speed map", zh: "車速圖" },
  { id: "parking", label: "Parking", zh: "泊車" },
  { id: "roadworks", label: "Roadworks", zh: "道路工程" },
  { id: "buses", label: "Buses", zh: "巴士" },
  { id: "map", label: "Live map", zh: "實時地圖" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function hktClock(): string {
  return new Date().toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
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
  const [now, setNow] = useState(() => Date.now());
  const [clock, setClock] = useState(hktClock);
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
    const t = setInterval(() => {
      setNow(Date.now());
      setClock(hktClock());
    }, 1000);
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

  const tickerItems = useMemo(() => (incidents.data?.incidents ?? []).slice(0, 12), [incidents.data]);

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-16 sm:px-5">
      {/* header: direction-sign board */}
      <header className="pt-5">
        <div className="overflow-hidden rounded-md border border-white/20 bg-sign-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
            <div className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border-2 border-white text-lg font-bold text-white">HK</div>
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-semibold uppercase leading-none tracking-wide text-white">HK Traffic Ops <span className="whitespace-nowrap text-white/75">香港即時交通</span></h1>
              <p className="font-gmono mt-1 text-[11px] uppercase tracking-[0.18em] text-white/65">Live traffic from Transport Department open data · data.gov.hk</p>
            </div>
            <div className="ml-auto flex items-center gap-2.5 rounded-[4px] bg-black px-3 py-2">
              <span className="led inline-block h-2 w-2 bg-vms-400" />
              <span className="font-gmono text-sm font-medium text-vms-300">{clock} HKT</span>
            </div>
          </div>
          <div className="flex flex-col gap-[2px] bg-black/30 px-4 py-[5px]" aria-hidden>
            <div className="h-[2px] bg-vms-400/90" />
            <div className="h-[2px] bg-vms-400/90" />
          </div>
        </div>
      </header>

      {/* ticker: VMS board */}
      {tickerItems.length > 0 && (
        <button onClick={() => setTab("incidents")} className="mb-4 mt-4 flex w-full items-center gap-3 overflow-hidden rounded-md border border-line bg-black py-2.5 text-left">
          <span className="font-gmono flex shrink-0 items-center gap-1.5 pl-3 text-[10px] uppercase tracking-[0.2em]">
            <span className="bg-bad-500 px-1.5 py-0.5 font-bold text-white">事故</span>
            <span className="text-vms-300">Incident wire</span>
          </span>
          <span className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
            <span className="ticker-track font-gmono inline-flex gap-10 whitespace-nowrap pr-10 text-xs text-vms-300/90">
              {[...tickerItems, ...tickerItems].map((i, k) => (
                <span key={k}>▸ {i.location || i.heading}{i.direction ? ` → ${i.direction}` : ""}</span>
              ))}
            </span>
          </span>
        </button>
      )}

      {/* tabs: ledger */}
      <nav className="sticky top-0 z-40 -mx-3 mb-5 overflow-x-auto border-b border-line bg-ink-950/95 px-3 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex gap-5">
          {TABS.map((t) => {
            const badge =
              t.id === "incidents" && incidents.data ? incidents.data.count :
              t.id === "roadworks" && roadworks.data ? roadworks.data.count :
              t.id === "cameras" && cameras.data ? cameras.data.count : null;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`font-display shrink-0 border-b-2 px-0.5 pb-2 pt-3 text-[17px] font-semibold uppercase tracking-wide transition ${active ? "border-vms-400 text-stone-100" : "border-transparent text-stone-500 hover:text-stone-200"}`}>
                {t.label} <span className={`text-[13px] font-medium ${active ? "text-vms-300" : "text-stone-600"}`}>{t.zh}</span>
                {badge != null && <span className="font-gmono ml-1.5 text-[11px] opacity-70">{badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "overview" && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi label="Active incidents 事故" value={kpis.active} sub="TD special traffic news" tone={kpis.active ? "red" : "green"} onClick={() => setTab("incidents")} />
            <Kpi label="Slow detectors 擠塞" value={kpis.slow} sub={kpis.slowTotal ? `of ${kpis.slowTotal} monitored` : "detector network"} tone={kpis.slow ? "amber" : "green"} onClick={() => setTab("speeds")} />
            <Kpi label="Worst harbour crossing 過海" value={kpis.worst ? `${kpis.worst.minutes} min` : null} sub={kpis.worst ? `${kpis.worst.origin} → ${kpis.worst.destination}` : "journey indicators"} tone="signal" onClick={() => setTab("journey")} />
            <Kpi label="Car parks full 已滿" value={parking.data ? kpis.full : null} sub="private-car spaces" tone={kpis.full ? "amber" : "green"} onClick={() => setTab("parking")} />
          </div>

          {/* latest + slowest */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-[19px] font-semibold uppercase tracking-wide text-stone-100">Latest on the wire <span className="text-stone-500">最新事故</span></h3>
                <button onClick={() => setTab("incidents")} className="text-xs text-vms-300 hover:underline">View all →</button>
              </div>
              <div className="space-y-2.5">
                {(incidents.data?.incidents ?? []).slice(0, 3).map((i) => (
                  <div key={i.id} className="border-b border-line/50 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <ToneBadge tone={/NEW/.test(i.status.toUpperCase()) ? "red" : "amber"}>{i.status || "Notice"}</ToneBadge>
                      <span className="font-gmono">{ago(i.announcedAt, now)}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-stone-100">{i.location || i.heading}{i.direction ? ` → ${i.direction}` : ""}</p>
                    <p className="line-clamp-2 text-xs text-stone-400">{i.content}</p>
                  </div>
                ))}
                {!incidents.data && <p className="text-sm text-stone-500">Loading…</p>}
              </div>
            </div>
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-[19px] font-semibold uppercase tracking-wide text-stone-100">Slowest detectors <span className="text-stone-500">最慢路段</span></h3>
                <button onClick={() => setTab("speeds")} className="text-xs text-vms-300 hover:underline">Full table →</button>
              </div>
              <div className="space-y-2">
                {[...(detectors.data?.points ?? [])].sort((a, b) => a.avgSpeed - b.avgSpeed).slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className={`font-gmono w-16 shrink-0 text-right text-sm font-bold ${p.avgSpeed < 25 ? "text-bad-400" : p.avgSpeed < 50 ? "text-slow-400" : "text-go-400"}`}>{p.avgSpeed}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-stone-200">{p.road}</div>
                      <div className="h-1 overflow-hidden rounded-[2px] bg-white/5">
                        <div className="h-full rounded" style={{ width: `${Math.min(100, (p.avgSpeed / 80) * 100)}%`, background: p.avgSpeed < 25 ? "#ef4444" : p.avgSpeed < 50 ? "#f59e0b" : "#22c55e" }} />
                      </div>
                    </div>
                  </div>
                ))}
                {!detectors.data && <p className="text-sm text-stone-500">Loading…</p>}
              </div>
            </div>
          </div>

          {/* speed map panels: the gantry boards */}
          <div className="card p-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-[19px] font-semibold uppercase tracking-wide text-stone-100">What the gantry signs say <span className="text-stone-500">新界顯示屏</span></h3>
              <FeedNote updatedAt={detectors.updatedAt} label="TD IMAGES" />
            </div>
            <p className="mb-3 text-xs text-stone-500">The Sha Tin approach boards, pulled straight from TD&apos;s image feed.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {PANELS.map((p) => (
                <figure key={p.code} className="overflow-hidden rounded-[5px] border border-line bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://resource.data.one.gov.hk/td/jss/${p.code}.en.png?t=${bustToken}`} alt={p.label} loading="lazy" className="aspect-[4/5] w-full object-contain" />
                  <figcaption className="px-2 py-1.5 text-[10px] leading-tight text-stone-400">{p.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          {/* quick links */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <QuickGo label="CCTV stills" zh="交通快拍" desc="a thousand roadside cameras" onClick={() => setTab("cameras")} />
            <QuickGo label="Car parks" zh="泊車" desc="live vacancies" onClick={() => setTab("parking")} />
            <QuickGo label="Bus ETAs" zh="巴士" desc="KMB · Citybus · GMB" onClick={() => setTab("buses")} />
            <QuickGo label="Live map" zh="地圖" desc="detectors and works" onClick={() => setTab("map")} />
          </div>
        </div>
      )}

      {tab === "incidents" && <IncidentsPanel poll={incidents} now={now} />}
      {tab === "journey" && <JourneyPanel poll={journey} now={now} />}
      {tab === "cameras" && <CamerasPanel poll={cameras} bustToken={bustToken} onBust={() => setBustToken(Date.now())} />}
      {tab === "speeds" && <DetectorsPanel poll={detectors} />}
      {tab === "parking" && <ParkingPanel poll={parking} now={now} />}
      {tab === "roadworks" && <RoadworksPanel poll={roadworks} now={now} />}
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
          <p className="mt-2 text-[11px] text-stone-600">Toggle layers top-left. Cameras and car parks are capped for performance; their tabs hold the full searchable lists.</p>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone, onClick }: {
  label: string; value: number | string | null; sub: string;
  tone: "red" | "green" | "amber" | "signal"; onClick: () => void;
}) {
  const color = tone === "red" ? "text-bad-400" : tone === "amber" ? "text-slow-400" : tone === "signal" ? "text-vms-300" : "text-go-400";
  const notch = tone === "red" ? "bg-bad-500" : tone === "amber" ? "bg-slow-500" : tone === "signal" ? "bg-vms-400" : "bg-go-500";
  return (
    <button onClick={onClick} className="card rise group overflow-hidden p-4 pt-0 text-left transition hover:border-stone-500/40">
      <div className={`mb-3 h-[3px] -mx-4 ${notch}`} aria-hidden />
      <div className="font-gmono text-[10px] uppercase tracking-[0.18em] text-stone-500">{label}</div>
      <div className={`font-display mt-1 text-[34px] font-semibold leading-none ${color}`}>{value ?? "…"}</div>
      <div className="mt-1.5 truncate text-[11px] text-stone-500 group-hover:text-vms-300">{sub} →</div>
    </button>
  );
}

function QuickGo({ label, zh, desc, onClick }: { label: string; zh: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card group flex items-center justify-between gap-2 p-4 text-left transition hover:border-stone-500/40">
      <span>
        <span className="font-display block text-[20px] font-semibold uppercase leading-none tracking-wide text-stone-100">{label} <span className="text-[15px] text-stone-500">{zh}</span></span>
        <span className="mt-1 block text-[11px] text-stone-500">{desc}</span>
      </span>
      <span className="font-gmono text-vms-300 transition group-hover:transtone-x-1">→</span>
    </button>
  );
}
