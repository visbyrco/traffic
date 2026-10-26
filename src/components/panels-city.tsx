"use client";

import { useEffect, useMemo, useState } from "react";
import type { CarPark, Roadwork } from "@/lib/td";
import { vehicleLabel } from "@/lib/td";
import {
  FeedNote, Field, PanelError, SectionHead, Skeleton, StatusLine,
  ago, hkTime, inputCls, type PollState, type Tone,
} from "./ui";

/* -------------------------------- parking ------------------------------- */

interface ParkingPayload { parks: CarPark[] }

function vacancyTone(v: number): Tone {
  if (v <= 0) return "red";
  if (v < 10) return "amber";
  return "green";
}

export function ParkingPanel({ poll, now }: { poll: PollState<ParkingPayload>; now: number }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");
  const [avail, setAvail] = useState("all");
  const [veh, setVeh] = useState("privateCar");
  const [shown, setShown] = useState(48);

  const districts = useMemo(() => [...new Set((poll.data?.parks ?? []).map((p) => p.district).filter(Boolean))].sort(), [poll.data]);
  const vehicles = useMemo(() => [...new Set((poll.data?.parks ?? []).flatMap((p) => p.vacancies.map((v) => v.vehicle)))].sort(), [poll.data]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (poll.data?.parks ?? [])
      .map((p) => ({ p, v: p.vacancies.find((x) => x.vehicle === veh) }))
      .filter(({ p, v }) => {
        if (district !== "all" && p.district !== district) return false;
        if (needle && `${p.name} ${p.address} ${p.id}`.toLowerCase().includes(needle) === false) return false;
        if (avail === "space" && (v == null || v.vacancy <= 0)) return false;
        if (avail === "low" && (v == null || v.vacancy >= 10 || v.vacancy <= 0)) return false;
        if (avail === "full" && (v == null || v.vacancy !== 0)) return false;
        return true;
      })
      .sort((a, b) => (a.v?.vacancy ?? 1e9) - (b.v?.vacancy ?? 1e9));
  }, [poll.data, q, district, avail, veh]);

  return (
    <section>
      <SectionHead
        kicker="One-stop parking 泊車 · ~590 car parks"
        title="Car parks"
        blurb="Live vacancies from the one-stop feed: TD car parks, Kowloon East smart parks, mall parks. EV and accessible bays where reported."
        right={<FeedNote updatedAt={poll.updatedAt} label="LIVE" />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Field label={`Search · ${list.length} car parks`} grow>
              <input value={q} onChange={(e) => { setQ(e.target.value); setShown(48); }} placeholder="e.g. Tsim Sha Tsui, IFC, Tin Shui Wai…" className={inputCls} />
            </Field>
            <Field label="District">
              <select value={district} onChange={(e) => { setDistrict(e.target.value); setShown(48); }} className={inputCls}>
                <option value="all">All districts</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Vehicle">
              <select value={veh} onChange={(e) => setVeh(e.target.value)} className={inputCls}>
                {vehicles.map((v) => <option key={v} value={v}>{vehicleLabel(v)}</option>)}
              </select>
            </Field>
            <Field label="Spaces">
              <select value={avail} onChange={(e) => { setAvail(e.target.value); setShown(48); }} className={inputCls}>
                <option value="all">Any</option>
                <option value="space">Has space</option>
                <option value="low">Low (&lt; 10)</option>
                <option value="full">Full</option>
              </select>
            </Field>
          </div>
          <div className="border-t border-hairline">
            {list.slice(0, shown).map(({ p, v }) => (
              <div key={p.id} className="flex items-baseline gap-4 border-b border-hairline py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-ink">{p.name}</div>
                  <div className="type-data truncate text-muted">{p.district} · {p.address}</div>
                  <div className="type-data mt-0.5 text-muted">
                    {p.opening ? `${p.opening} · ` : ""}{p.height ? `≤ ${p.height}m · ` : ""}{v ? `upd ${ago(v.lastupdate, now)}` : "no live feed"}
                    {v != null && (v.ev != null || v.dis != null) && (
                      <span> · {v.ev != null && <span>EV {v.ev} </span>}{v.dis != null && <span>accessible {v.dis}</span>}</span>
                    )}
                  </div>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[12px] text-accent hover:underline">operator site</a>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {v ? (
                    <>
                      <div className={`font-display text-2xl font-semibold tabular-nums leading-none ${v.vacancy <= 0 ? "text-bad" : v.vacancy < 10 ? "text-warn" : "text-good"}`}>{v.vacancy}</div>
                      <div className="mt-1"><StatusLine tone={vacancyTone(v.vacancy)}>{v.vacancy <= 0 ? "Full" : "spaces"}</StatusLine></div>
                    </>
                  ) : <span className="type-data text-muted">no data</span>}
                </div>
              </div>
            ))}
          </div>
          {list.length === 0 && <p className="border-b border-hairline py-8 text-center text-sm text-muted">No car parks match.</p>}
          {shown < list.length && (
            <div className="mt-6 text-center">
              <button onClick={() => setShown(shown + 60)} className="rounded-lg border border-hairline px-4 py-2 text-[13px] text-accent transition hover:bg-wash">
                Show more ({list.length - shown} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------- roadworks ------------------------------ */

interface RoadworksPayload { roadworks: Roadwork[]; count: number }

export function RoadworksPanel({ poll }: { poll: PollState<RoadworksPayload> }) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("all");

  const districts = useMemo(() => [...new Set((poll.data?.roadworks ?? []).map((r) => r.district).filter(Boolean))].sort(), [poll.data]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (poll.data?.roadworks ?? []).filter((r) =>
      (district === "all" || r.district === district) &&
      (!needle || `${r.road} ${r.detail} ${r.worksType} ${r.lane}`.toLowerCase().includes(needle)));
  }, [poll.data, q, district]);

  return (
    <section>
      <SectionHead
        kicker="Highways Dept · closures on 70 km/h+ roads"
        title="Roadworks"
        blurb="Lane closures on faster roads, with the affected lanes and times."
        right={<FeedNote updatedAt={poll.updatedAt} label={`${poll.data?.count ?? 0} ACTIVE`} />}
      />
      {poll.error && <PanelError message={poll.error} onRetry={poll.refresh} />}
      {poll.loading && !poll.data ? <Skeleton rows={4} /> : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Field label="Search road / works" grow>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Tsing Yi, tunnel, resurfacing…" className={inputCls} />
            </Field>
            <Field label="District">
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls}>
                <option value="all">All districts</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          {list.length === 0 && <p className="border-y border-hairline py-8 text-center text-sm text-muted">No roadworks on record right now.</p>}
          <div className="border-t border-hairline">
            {list.map((r) => (
              <article key={r.id} className="border-b border-hairline py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusLine tone={r.status === "In Progress" ? "amber" : "grey"}>{r.status || "Scheduled"}</StatusLine>
                  <span className="type-data text-muted">{r.worksType}</span>
                </div>
                <h3 className="mt-1.5 text-[16px] font-semibold text-ink">{r.road}</h3>
                <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{r.detail}</p>
                <div className="type-data mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted">
                  {r.district && <span>{r.district}</span>}
                  {r.bound && <span>{r.bound} bound</span>}
                  {r.lane && <span className="text-warn">{r.lane}</span>}
                </div>
                <div className="type-data mt-1 text-muted">{r.start} → {r.end}</div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* --------------------------------- buses -------------------------------- */

type Co = "kmb" | "ctb" | "gmb";

interface StopRow { seq: number; id: string; name: string; }
interface EtaRow { seq: number; eta: string; dest: string; remark: string; }

async function busGet(co: Co, path: string) {
  const r = await fetch(`/api/bus/${co}?path=${encodeURIComponent(path)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}

const stopNameCache = new Map<string, Map<string, string>>();

async function kmbStopIndex(): Promise<Map<string, string>> {
  if (!stopNameCache.has("kmb")) {
    const j = await busGet("kmb", "/stop");
    const m = new Map<string, string>();
    for (const s of j.data ?? []) m.set(s.stop, s.name_en || s.name_tc);
    stopNameCache.set("kmb", m);
  }
  return stopNameCache.get("kmb")!;
}

async function ctbStopName(id: string): Promise<string> {
  const co = stopNameCache.get("ctb") ?? new Map<string, string>();
  if (!co.has(id)) {
    try {
      const j = await busGet("ctb", `/stop/${id}`);
      co.set(id, j.data?.name_en || j.data?.name_tc || id);
    } catch { co.set(id, id); }
    stopNameCache.set("ctb", co);
  }
  return co.get(id)!;
}

export function BusesPanel({ now }: { now: number }) {
  const [co, setCo] = useState<Co>("kmb");
  const [routeInput, setRouteInput] = useState("101");
  const [variants, setVariants] = useState<{ key: string; label: string; dir: string; st: string; route: string }[]>([]);
  const [variantKey, setVariantKey] = useState("");
  const [stops, setStops] = useState<StopRow[]>([]);
  const [etas, setEtas] = useState<EtaRow[]>([]);
  const [gmbRegions] = useState(["HKI", "KLN", "NT"]);
  const [gmbRegion, setGmbRegion] = useState("HKI");
  const [gmbRoutes, setGmbRoutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (co !== "gmb") return;
    busGet("gmb", `/route/${gmbRegion}`)
      .then((j) => setGmbRoutes(j.data?.routes ?? []))
      .catch((e) => setError(e.message));
  }, [co, gmbRegion]);

  const search = async () => {
    setLoading(true); setError(null); setStops([]); setEtas([]); setVariants([]);
    try {
      if (co === "kmb") {
        const q = routeInput.trim().toUpperCase();
        const rl = await busGet("kmb", "/route");
        const matches = (rl.data ?? []).filter((r: { route: string }) => r.route.toUpperCase() === q);
        if (matches.length === 0) throw new Error(`No KMB/LWB route ${q} found.`);
        const vars = matches.map((r: { bound: string; service_type: string; route: string; orig_en: string; dest_en: string }) => ({
          key: `${r.route}|${r.bound}|${r.service_type}`,
          label: `${r.route} · ${r.bound === "O" ? "Outbound" : "Inbound"} · ${r.orig_en} → ${r.dest_en}`,
          dir: r.bound === "O" ? "outbound" : "inbound",
          st: String(r.service_type),
          route: r.route,
        }));
        setVariants(vars);
        setVariantKey(vars[0].key);
        await loadKmb(vars[0]);
      } else if (co === "ctb") {
        const q = routeInput.trim().toUpperCase();
        const rl = await busGet("ctb", "/route/ctb");
        const match = (rl.data ?? []).find((r: { route: string }) => r.route.toUpperCase() === q);
        if (!match) throw new Error(`No Citybus route ${q} found.`);
        setVariants([{ key: `${q}|O`, label: `${q} · Outbound · ${match.orig_en} → ${match.dest_en}`, dir: "outbound", st: "", route: q },
          { key: `${q}|I`, label: `${q} · Inbound · ${match.dest_en} → ${match.orig_en}`, dir: "inbound", st: "", route: q }]);
        setVariantKey(`${q}|O`);
        await loadCtb(q, "outbound");
      } else {
        const code = routeInput.trim();
        const det = await busGet("gmb", `/route/${gmbRegion}/${code}`);
        const dirs = det.data?.[0]?.directions ?? [];
        if (dirs.length === 0) throw new Error(`No GMB route ${code} in ${gmbRegion}.`);
        const vars = dirs.map((d: { route_seq: number; orig_en: string; dest_en: string }) => ({
          key: `${det.data[0].route_id}|${d.route_seq}`,
          label: `${code} · ${d.orig_en} → ${d.dest_en}`,
          dir: String(d.route_seq),
          st: String(det.data[0].route_id),
          route: code,
        }));
        setVariants(vars);
        setVariantKey(vars[0].key);
        await loadGmb(det.data[0].route_id, dirs[0].route_seq);
      }
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadKmb = async (v: { route: string; dir: string; st: string }) => {
    const [rs, eta] = await Promise.all([
      busGet("kmb", `/route-stop/${v.route}/${v.dir}/${v.st}`),
      busGet("kmb", `/route-eta/${v.route}/${v.st}`),
    ]);
    const idx = await kmbStopIndex();
    const wantDir = v.dir === "outbound" ? "O" : "I";
    setStops((rs.data ?? []).map((s: { seq: string; stop: string }) => ({
      seq: Number(s.seq), id: s.stop, name: idx.get(s.stop) ?? s.stop,
    })));
    setEtas((eta.data ?? []).filter((e: { dir: string }) => e.dir === wantDir).map((e: { seq: number; eta: string; dest_en: string; rmk_en: string }) => ({
      seq: Number(e.seq), eta: e.eta, dest: e.dest_en, remark: e.rmk_en,
    })));
  };

  const loadCtb = async (route: string, dir: string) => {
    const rs = await busGet("ctb", `/route-stop/CTB/${route}/${dir}`);
    const rows: StopRow[] = (rs.data ?? []).map((s: { seq: number; stop: string }) => ({ seq: Number(s.seq), name: s.stop, id: s.stop }));
    setStops(rows);
    setEtas([]);
    const names = await Promise.all(rows.map((r) => ctbStopName(r.id)));
    setStops(rows.map((r, i) => ({ ...r, name: names[i] })));
  };

  const loadGmb = async (routeId: number, routeSeq: number) => {
    const rs = await busGet("gmb", `/route-stop/${routeId}/${routeSeq}`);
    const rows: StopRow[] = (rs.data?.route_stops ?? []).map((s: { stop_seq: number; stop_id: number; name_en: string }) => ({
      seq: s.stop_seq, id: String(s.stop_id), name: s.name_en,
    }));
    setStops(rows);
    if (rows.length > 0) await loadGmbEta(routeId, routeSeq, rows[0]);
  };

  const [gmbStop, setGmbStop] = useState("");
  const loadGmbEta = async (routeId: number, routeSeq: number, stop: StopRow) => {
    setGmbStop(stop.id);
    const j = await busGet("gmb", `/eta/route-stop/${routeId}/${routeSeq}/${stop.seq}`);
    const arr = j.data?.eta ?? [];
    setEtas(arr.map((e: { timestamp: string; remarks_en: string }) => ({ seq: stop.seq, eta: e.timestamp, dest: stop.name, remark: e.remarks_en ?? "" })));
  };

  const onVariant = async (key: string) => {
    setVariantKey(key);
    const v = variants.find((x) => x.key === key);
    if (!v) return;
    setLoading(true); setError(null);
    try {
      if (co === "kmb") await loadKmb(v);
      else if (co === "ctb") await loadCtb(v.route, v.dir);
      else await loadGmb(Number(v.st), Number(v.dir));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const etaByStop = useMemo(() => {
    const m = new Map<number, EtaRow[]>();
    for (const e of etas) {
      const arr = m.get(e.seq) ?? [];
      arr.push(e);
      m.set(e.seq, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => +new Date(a.eta) - +new Date(b.eta));
    return m;
  }, [etas]);

  const mins = (iso: string) => {
    const d = Math.round((+new Date(iso) - now) / 60000);
    if (Number.isNaN(d)) return "—";
    return d <= 0 ? "due" : `${d} min`;
  };

  return (
    <section>
      <SectionHead
        kicker="KMB · Citybus · GMB 實時到站"
        title="Bus ETAs"
        blurb="Next-bus times from the operators. Pick a route, a direction, a stop."
        right={searched ? <FeedNote updatedAt={new Date()} label="LIVE" /> : undefined}
      />
      <div className="mb-5 flex flex-wrap gap-3">
        <Field label="Operator">
          <select value={co} onChange={(e) => { setCo(e.target.value as Co); setVariants([]); setStops([]); setEtas([]); setSearched(false); setError(null); }} className={inputCls}>
            <option value="kmb">KMB / Long Win Bus</option>
            <option value="ctb">Citybus</option>
            <option value="gmb">Green Minibus</option>
          </select>
        </Field>
        {co === "gmb" && (
          <Field label="Region">
            <select value={gmbRegion} onChange={(e) => setGmbRegion(e.target.value)} className={inputCls}>
              {gmbRegions.map((r) => <option key={r} value={r}>{r === "HKI" ? "HK Island" : r === "KLN" ? "Kowloon" : "New Territories"}</option>)}
            </select>
          </Field>
        )}
        <Field label={co === "gmb" ? `Route no. · ${gmbRoutes.length} in ${gmbRegion}` : "Route no."} grow>
          <input value={routeInput} onChange={(e) => setRouteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={co === "gmb" ? "e.g. 1" : "e.g. 101"} list={co === "gmb" ? "gmb-routes" : undefined} className={`${inputCls} font-gmono uppercase`} />
          {co === "gmb" && (
            <datalist id="gmb-routes">{gmbRoutes.map((r) => <option key={r} value={r} />)}</datalist>
          )}
        </Field>
        <div className="flex items-end">
          <button onClick={search} disabled={loading} className="min-h-9 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink transition hover:bg-wash disabled:opacity-50">
            {loading ? "Loading" : "Find stops"}
          </button>
        </div>
      </div>
      {error && <PanelError message={error} onRetry={search} />}
      {variants.length > 0 && (
        <Field label="Direction">
          <select value={variantKey} onChange={(e) => onVariant(e.target.value)} className={inputCls}>
            {variants.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </Field>
      )}
      {stops.length > 0 && (
        <div className="mt-4 overflow-x-auto border-t border-hairline">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="type-eyebrow border-b border-hairline text-muted">
                <th className="w-10 py-2.5 pr-2 text-right font-normal">#</th>
                <th className="px-2 py-2.5 font-normal">Stop</th>
                <th className="py-2.5 pl-2 text-right font-normal">Next buses</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((s) => {
                const list = etaByStop.get(s.seq) ?? [];
                const show = co === "gmb" ? list.filter(() => s.id === gmbStop) : list.slice(0, 3);
                return (
                  <tr key={s.seq} className="row-hover border-b border-hairline">
                    <td className="type-data py-2.5 pr-2 text-right text-muted">{s.seq}</td>
                    <td className="px-2 py-2.5 font-medium text-ink">{s.name}</td>
                    <td className="py-2.5 pl-2">
                      <div className="flex flex-wrap justify-end gap-3">
                        {co === "gmb" ? (
                          <button onClick={() => { const v = variants.find((x) => x.key === variantKey); if (v) { setLoading(true); loadGmbEta(Number(v.st), Number(v.dir), s).catch((e) => setError(String(e))).finally(() => setLoading(false)); } }}
                            className="type-data text-accent hover:underline">
                            {s.id === gmbStop && show.length > 0 ? show.map((e) => mins(e.eta)).join(" · ") : "Check ETA"}
                          </button>
                        ) : show.length === 0 ? <span className="type-data text-muted">no departures</span> :
                          show.map((e, i) => (
                            <span key={i} title={`${hkTime(e.eta)} · ${e.dest} ${e.remark ? `· ${e.remark}` : ""}`}
                              className={`type-data ${i === 0 ? "font-medium text-accent" : "text-muted"}`}>
                              {mins(e.eta)}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
