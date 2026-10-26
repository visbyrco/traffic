/* Shared types, label maps and server-side fetch/parse helpers for
   Transport Department open datasets (DATA.GOV.HK). */

export const UA = { "User-Agent": "visbyr-traffic/1.0 (Vercel; data.gov.hk)" };

export async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  const raw = await res.text();
  return raw.replace(/^\uFEFF/, "");
}

/* ------------------------------- incidents ------------------------------ */

export interface Incident {
  id: string;
  number: string;
  heading: string;
  headingTc: string;
  detail: string;
  detailTc: string;
  location: string;
  locationTc: string;
  direction: string;
  directionTc: string;
  district: string;
  districtTc: string;
  landmark: string;
  landmarkTc: string;
  content: string;
  contentTc: string;
  status: string;
  statusTc: string;
  announcedAt: string;
}

function tag(src: string, name: string): string {
  const m = src.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return (m?.[1] ?? "").trim();
}

export function parseIncidents(xml: string): Incident[] {
  const out: Incident[] = [];
  for (const m of xml.matchAll(/<message>([\s\S]*?)<\/message>/g)) {
    const b = m[1];
    // One TD feed carries both languages: _EN and _CN siblings.
    const landmarkEn = tag(b, "NEAR_LANDMARK_EN");
    const landmarkTc = tag(b, "NEAR_LANDMARK_CN");
    out.push({
      id: tag(b, "ID"),
      number: tag(b, "INCIDENT_NUMBER"),
      heading: tag(b, "INCIDENT_HEADING_EN") || "Traffic notice",
      headingTc: tag(b, "INCIDENT_HEADING_CN"),
      detail: tag(b, "INCIDENT_DETAIL_EN"),
      detailTc: tag(b, "INCIDENT_DETAIL_CN"),
      location: tag(b, "LOCATION_EN"),
      locationTc: tag(b, "LOCATION_CN"),
      direction: tag(b, "DIRECTION_EN"),
      directionTc: tag(b, "DIRECTION_CN"),
      district:
        tag(b, "DISTRICT_EN") ||
        tag(b, "NEAR_LANDMARK_EN") ||
        tag(b, "BETWEEN_LANDMARK_EN"),
      districtTc:
        tag(b, "DISTRICT_CN") ||
        tag(b, "NEAR_LANDMARK_CN") ||
        tag(b, "BETWEEN_LANDMARK_CN"),
      landmark: landmarkEn,
      landmarkTc,
      content: tag(b, "CONTENT_EN"),
      contentTc: tag(b, "CONTENT_CN"),
      status: tag(b, "INCIDENT_STATUS_EN"),
      statusTc: tag(b, "INCIDENT_STATUS_CN"),
      announcedAt: tag(b, "ANNOUNCEMENT_DATE"),
    });
  }
  return out
    .filter((i) => i.id || i.content)
    .sort((a, b) => String(b.announcedAt).localeCompare(String(a.announcedAt)));
}

/* -------------------------------- journey ------------------------------- */

export interface JourneyReading {
  origin: string;
  originName: string;
  region: string;
  direction: string;
  destination: string;
  destinationCode: string;
  minutes: number;
  colour: 1 | 2 | 3;
  capturedAt: string;
}

export const ORIGIN_REGION: Record<string, string> = {
  H: "Hong Kong Island",
  K: "Kowloon",
  N: "New Territories",
  SJ: "Speed panel sites",
};

/* Origin site names. H/K/N sites: HKeMobility journey-time location service
   (TD's own wording). SJ sites: TD speed-map-panel locations file. */
export const ORIGIN_NAMES: Record<string, string> = {
  H1: "Gloucester Road eastbound near Revenue Tower",
  H11: "Island Eastern Corridor westbound near Lei King Wan",
  H2: "Canal Road Flyover northbound near exit of Aberdeen Tunnel",
  H3: "Island Eastern Corridor westbound near City Garden",
  H4: "Wong Nai Chung Road northbound near Queen's Road East",
  H5: "Hing Fat Street northbound near Victoria Park",
  H6: "Repulse Bay Road northbound near Island Road",
  H7: "Wong Chuk Hang Road northbound near the Hong Kong Country Club",
  H8: "Wong Chuk Hang Road eastbound near Aberdeen Sports Ground",
  H9: "Ap Lei Chau Bridge Road northbound near Wong Chuk Hang Road",
  K01: "Ferry Street southbound near Charming Garden",
  K02: "Gascoigne Road eastbound near the Hong Kong Polytechnic University",
  K03: "Waterloo Road southbound near Kowloon Hospital",
  K04: "Princess Margaret Road southbound near Oi Man Estate",
  K05: "Kai Fuk Road northbound near the petrol stations",
  K06: "Chatham Road North southbound near Fat Kwong Street Playground",
  K07: "West Kowloon Highway westbound near MTR Nam Cheong Station",
  K08: "Kai Cheung Road westbound near Kowloon Bay Divisional Fire Station",
  N01: "Hung Tin Road southbound near junction with Hung Chi Road",
  N02: "Long Tin Road southbound near Parkside Villa",
  N03: "Yuen Long Highway eastbound near Shap Pat Heung Interchange",
  N05: "Tai Po Road eastbound near Kwong Fuk Estate",
  N06: "Tsing Sha Highway westbound near Shing Mun River Channel",
  N07: "Fuk Man Road northbound near Po Tung Road",
  N08: "Po Shun Road southbound near Chung Ming Court",
  N09: "Wan Po Road westbound near Hong Kong Velodrome",
  N10: "Po Hong Road southbound near KMB Tseung Kwan O Depot",
  N11: "Po Yap Road westbound near Tiu Keng Leng Sports Centre",
  N12: "Po Shun Road southbound near Tiu Keng Leng Sports Centre",
  N13: "Chui Ling Road eastbound near Tiu Keng Leng Sports Centre",
  SJ1: "Tai Po Road southbound near Sha Tin Racecourse",
  SJ2: "Tate's Cairn Highway southbound near Shek Mun",
  SJ3: "Tolo Highway southbound near the Science Park",
  SJ4: "San Tin Highway southbound near Fairview Park",
  SJ5: "Tuen Mun Road near Tseng Choi Street",
};

export const DIR_NAMES: Record<string, string> = {
  HKKL: "HK Island to Kowloon",
  KLHK: "Kowloon to HK Island",
  NTKL: "New Territories to Kowloon",
  NTA: "New Territories to Airport",
  OTH: "Other routes",
};

const ORIGIN_DIR: Record<string, string> = {
  H1: "HKKL", H2: "HKKL", H3: "HKKL", H4: "HKKL", H5: "HKKL", H11: "HKKL",
  K01: "KLHK", K02: "KLHK", K03: "KLHK", K04: "KLHK", K05: "KLHK", K06: "KLHK", K08: "KLHK",
  N06: "NTKL", N07: "NTKL", N08: "NTKL", N09: "NTKL", N10: "NTKL",
  N01: "NTA", N02: "NTA", SJ4: "NTA",
};

/* Destination names. Most are HKeMobility's official wordings. LRT / SMT /
   TCT are the Sha Tin tunnel names read off the SJ1-SJ3 sign faces and
   matched to feed pairs by displayed minutes. TWCP / TWTM are verbatim from
   the SJ5 sign face. */
export const DEST_NAMES: Record<string, string> = {
  CH: "Cross Harbour Tunnel",
  EH: "Eastern Harbour Crossing",
  WH: "Western Harbour Crossing",
  ABT: "Wan Chai via Aberdeen Tunnel",
  ACTT: "Airport via Route 3",
  ATL: "Airport via Tai Lam Tunnel",
  ATSCA: "Airport via Route 8",
  CWBR: "Kowloon via Clear Water Bay Road",
  KTPR: "Kowloon via Tai Po Road",
  LRT: "Lion Rock Tunnel",
  MOS: "Kowloon via Route 2",
  PFL: "Central via Pok Fu Lam Road",
  SMT: "Shing Mun Tunnels",
  SSCPR: "Sheung Shui via Castle Peak Road",
  SSYLH: "Sheung Shui via Route 9",
  TCT: "Tate's Cairn Tunnel",
  TKOLTT: "Kowloon via TKO-Lam Tin Tunnel",
  TKOT: "Kowloon via Tseung Kwan O Tunnel",
  TKTL: "Ting Kau via Tai Lam Tunnel",
  TKTM: "Ting Kau via Tuen Mun Road",
  TLH: "Shatin via Tolo Highway",
  TMCLK: "Airport via Tuen Mun Chek Lap Kok Tunnel",
  TPR: "Shatin via Tai Po Road",
  TSCA: "Kowloon (W) via Route 8",
  TWCP: "Tsuen Wan (W) via Castle Peak Road",
  TWTM: "Tsuen Wan via Tuen Mun Road",
  WNCG: "Wan Chai via Wong Nai Chung Gap Road",
};

export const COLOUR_LABEL: Record<number, { label: string; tone: string }> = {
  1: { label: "Smooth", tone: "green" },
  2: { label: "Slow", tone: "amber" },
  3: { label: "Congested", tone: "red" },
};

export function parseJourney(xml: string): JourneyReading[] {
  const out: JourneyReading[] = [];
  for (const m of xml.matchAll(/<jtis_journey_time>([\s\S]*?)<\/jtis_journey_time>/g)) {
    const b = m[1];
    const strip = (s: string) => s.replace(/<[^>]+>/g, "").trim();
    const origin = strip(tag(b, "LOCATION_ID"));
    const destCode = strip(tag(b, "DESTINATION_ID"));
    const minutes = parseInt(strip(tag(b, "JOURNEY_DATA")), 10);
    const colour = parseInt(strip(tag(b, "COLOUR_ID")), 10) as 1 | 2 | 3;
    if (!origin || !destCode || Number.isNaN(minutes)) continue;
    const prefix = origin.replace(/[0-9]/g, "");
    out.push({
      origin,
      originName: ORIGIN_NAMES[origin] ?? origin,
      region: ORIGIN_REGION[prefix] ?? prefix,
      direction: DIR_NAMES[ORIGIN_DIR[origin] ?? "OTH"] ?? DIR_NAMES.OTH,
      destination: DEST_NAMES[destCode] ?? destCode,
      destinationCode: destCode,
      minutes,
      colour: colour === 1 || colour === 2 || colour === 3 ? colour : 2,
      capturedAt: strip(tag(b, "CAPTURE_DATE")),
    });
  }
  return out;
}

/* -------------------------------- cameras ------------------------------- */

export interface Camera {
  key: string;
  region: string;
  district: string;
  description: string;
  lat: number;
  lng: number;
  url: string;
}

export function parseCameras(xml: string): Camera[] {
  const out: Camera[] = [];
  for (const m of xml.matchAll(/<image>([\s\S]*?)<\/image>/g)) {
    const b = m[1];
    const lat = parseFloat(tag(b, "latitude"));
    const lng = parseFloat(tag(b, "longitude"));
    out.push({
      key: tag(b, "key"),
      region: tag(b, "region"),
      district: tag(b, "district"),
      description: tag(b, "description"),
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
      url: tag(b, "url"),
    });
  }
  return out.filter((c) => c.key && c.url);
}

/* -------------------------------- detectors ----------------------------- */

export interface DetectorMeta {
  id: string;
  district: string;
  road: string;
  lat: number;
  lng: number;
  direction: string;
}

export function parseDetectorInfo(csv: string): Map<string, DetectorMeta> {
  const map = new Map<string, DetectorMeta>();
  const lines = csv.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Name fields never contain commas in this file, plain split is safe.
    const cols = line.split(",");
    if (cols.length < 9) continue;
    map.set(cols[0].trim(), {
      id: cols[0].trim(),
      district: cols[1].trim(),
      road: cols[2].trim(),
      lat: parseFloat(cols[7]),
      lng: parseFloat(cols[8]),
      direction: cols[9]?.trim() ?? "",
    });
  }
  return map;
}

export interface DetectorReading {
  id: string;
  avgSpeed: number;
  volume: number;
  maxOcc: number;
  lanes: number;
}

export function parseRawSpeedVol(xml: string): {
  date: string;
  from: string;
  to: string;
  detectors: DetectorReading[];
} {
  const date = tag(xml, "date");
  const from = tag(xml, "period_from");
  const to = tag(xml, "period_to");
  // The feed carries several consecutive 30s periods; the same detector id
  // repeats. Keep the latest reading per detector so keys stay unique.
  const latest = new Map<string, DetectorReading>();
  for (const m of xml.matchAll(/<detector>([\s\S]*?)<\/detector>/g)) {
    const b = m[1];
    const id = tag(b, "detector_id");
    let wSpeed = 0;
    let wVol = 0;
    let maxOcc = 0;
    let lanes = 0;
    for (const lm of b.matchAll(/<lane>([\s\S]*?)<\/lane>/g)) {
      const l = lm[1];
      if (tag(l, "valid") !== "Y") continue;
      const speed = parseFloat(tag(l, "speed"));
      const vol = parseFloat(tag(l, "volume"));
      const occ = parseFloat(tag(l, "occupancy"));
      if (!Number.isFinite(speed)) continue;
      lanes++;
      const v = Number.isFinite(vol) ? vol : 0;
      wSpeed += speed * Math.max(v, 0.5);
      wVol += Math.max(v, 0.5);
      if (Number.isFinite(occ)) maxOcc = Math.max(maxOcc, occ);
    }
    if (!id || lanes === 0) continue;
    latest.set(id, {
      id,
      avgSpeed: Math.round((wSpeed / wVol) * 10) / 10,
      volume: Math.round(wVol * 10) / 10,
      maxOcc,
      lanes,
    });
  }
  return { date, from, to, detectors: [...latest.values()] };
}

export type DetectorStatus = "smooth" | "slow" | "congested";

/** Heuristic only: TD publishes raw speed/occupancy, not a status. */
export function detectorStatus(d: DetectorReading): DetectorStatus {
  if (d.avgSpeed < 25 || d.maxOcc > 50) return "congested";
  if (d.avgSpeed < 50 || d.maxOcc > 25) return "slow";
  return "smooth";
}

/* --------------------------------- parking ------------------------------ */

export interface CarPark {
  id: string;
  name: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  height: number;
  opening: string | null;
  facilities: string[];
  website: string | null;
  vacancies: { vehicle: string; vacancy: number; ev: number | null; dis: number | null; lastupdate: string }[];
}

const VEHICLE_LABEL: Record<string, string> = {
  P: "Private car",
  privateCar: "Private car",
  M: "Motorcycle",
  motorCycle: "Motorcycle",
  P_D: "Disabled",
  L: "Light goods",
  LGV: "Light goods",
  H: "Heavy goods",
  HGV: "Heavy goods",
  B: "Bus",
  C: "Coach",
  coach: "Coach",
  CV: "Commercial vehicle",
  T: "Taxi",
  O: "Others",
  N: "Minibus",
};

export function vehicleLabel(code: string): string {
  return VEHICLE_LABEL[code] ?? code;
}

const ONE_STOP_VEHICLES = ["privateCar", "motorCycle", "LGV", "HGV", "coach", "CV"] as const;

type VacEntry = { vacancy_type?: string; vacancy?: number; vacancyEV?: number; vacancyDIS?: number; lastupdate?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickVacancy(list: any): VacEntry | null {
  const arr = (Array.isArray(list) ? list : [list]).filter(
    (c) => c && typeof c.vacancy === "number",
  ) as VacEntry[];
  if (arr.length === 0) return null;
  return arr.find((c) => c.vacancy_type === "A") ?? arr[0];
}

/** Merge DPO one-stop info + vacancy feeds (api.data.gov.hk/v1/carpark-info-vacancy). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeParking(info: any, vacancy: any): CarPark[] {
  const infos = info?.results ?? info?.car_park ?? [];
  const vacs = vacancy?.results ?? vacancy?.car_park ?? [];
  const vacById = new Map<string, Map<string, VacEntry>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of vacs as any[]) {
    const m = new Map<string, VacEntry>();
    const id = String(p.park_Id ?? p.park_id ?? "");
    if (!id) continue;
    for (const key of ONE_STOP_VEHICLES) {
      if (p[key] == null) continue;
      const chosen = pickVacancy(p[key]);
      if (chosen) m.set(key, chosen);
    }
    // Legacy TD shape fallback (vehicle_type array).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const vt of (p.vehicle_type ?? []) as any[]) {
      const cats = (vt.service_category ?? []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.category === "HOURLY" && typeof c.vacancy === "number",
      );
      if (cats.length === 0) continue;
      const chosen =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cats.find((c: any) => c.vacancy_type === "A") ?? cats[0];
      m.set(vt.type, { vacancy: chosen.vacancy, lastupdate: chosen.lastupdate });
    }
    if (m.size > 0) vacById.set(id, m);
  }
  return (
    infos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any): CarPark | null => {
        const id = String(p.park_Id ?? p.park_id ?? "");
        if (!id) return null;
        const heights = (p.heightLimits ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((h: any) => Number(h.height))
          .filter((h: number) => Number.isFinite(h) && h > 0);
        const vac = vacById.get(id) ?? new Map<string, VacEntry>();
        const vacancies = [...vac.entries()].map(([vehicle, v]) => ({
          vehicle,
          vacancy: v.vacancy ?? 0,
          ev: typeof v.vacancyEV === "number" ? v.vacancyEV : null,
          dis: typeof v.vacancyDIS === "number" ? v.vacancyDIS : null,
          lastupdate: v.lastupdate ?? "",
        }));
        return {
          id,
          name: p.name_en || p.name || p.name_tc || id,
          address: p.displayAddress || p.displayAddress_en || p.displayAddress_tc || "",
          district: p.district_en || p.district || "",
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          height: p.height ?? (heights.length ? Math.min(...heights) : 0),
          opening: p.opening_status ?? p.opening ?? null,
          facilities: Array.isArray(p.facilities) ? p.facilities : [],
          website: p.website_en || p.website || null,
          vacancies,
        };
      })
      .filter((p: CarPark | null): p is CarPark => p !== null && Number.isFinite(p.lat) && Number.isFinite(p.lng))
  );
}

/* -------------------------------- roadworks ----------------------------- */

export interface Roadwork {
  id: string;
  road: string;
  roadTc: string;
  district: string;
  districtTc: string;
  bound: string;
  boundTc: string;
  lane: string;
  laneTc: string;
  worksType: string;
  worksTypeTc: string;
  status: string;
  statusTc: string;
  start: string;
  end: string;
  detail: string;
  detailTc: string;
  lat: number;
  lng: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRoadworks(json: any): Roadwork[] {
  const arr = Array.isArray(json) ? json : [];
  return (
    arr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any): Roadwork => ({
        id: String(r.roadworks_id ?? ""),
        road: r.roadname ?? "",
        roadTc: r.roadname_tc ?? "",
        district: r.district ?? "",
        districtTc: r.district_tc ?? "",
        bound: r.bound ?? "",
        boundTc: r.bound_tc ?? "",
        lane: r.lane ?? "",
        laneTc: r.lane_tc ?? "",
        worksType: r.workstype ?? "",
        worksTypeTc: r.workstype_tc ?? "",
        status: r.worksstatus ?? "",
        statusTc: r.worksstatus_tc ?? "",
        start: r.starttime ?? "",
        end: r.endtime ?? "",
        detail: r.locdesc ?? "",
        detailTc: r.locdesc_tc ?? "",
        lat: Number(r.latitude) || 0,
        lng: Number(r.longitude) || 0,
      }))
      .filter((r: Roadwork) => r.id)
      .sort((a: Roadwork, b: Roadwork) => String(a.start).localeCompare(String(b.start)))
  );
}
