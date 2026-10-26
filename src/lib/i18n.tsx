"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Locale = "en" | "zh";
export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "zh", label: "繁中" },
];

const STORAGE_KEY = "visbyr-locale";

const en = {
  headerTagline: "Live TD open data",
  tabs: {
    overview: "Overview",
    incidents: "Incidents",
    journey: "Journey times",
    cameras: "Cameras",
    speeds: "Speed map",
    parking: "Parking",
    roadworks: "Roadworks",
    buses: "Buses",
    map: "Live map",
  },
  alertNew: "New",
  alertLatest: "Latest",
  overview: {
    glance: "Network at a glance",    kpiActive: "Active incidents",
    kpiActiveSub: "TD special traffic news",
    kpiSlow: "Slow detectors",
    kpiSlowSubAll: (total: number) => `of ${total} monitored`,
    kpiSlowSub: "Detector network",
    kpiWorst: "Worst harbour crossing",
    kpiWorstSub: "Journey indicators",
    kpiFull: "Car parks full",
    kpiFullSub: "Private-car spaces",
    latestWire: "Latest on the wire",
    slowest: "Slowest detectors",
    viewAll: "View all",
    fullTable: "Full table",
    gantry: "What the gantry signs say",
    gantryBlurb: "The Sha Tin approach boards, pulled straight from the TD image feed.",
    deeper: "Go deeper",
    quickCctv: "CCTV stills",
    quickCctvDesc: "A thousand roadside cameras",
    quickParks: "Car parks",
    quickParksDesc: "Live vacancies",
    quickBuses: "Bus ETAs",
    quickBusesDesc: "KMB · Citybus · GMB",
    quickMap: "Live map",
    quickMapDesc: "Detectors and works",
    mapNote: "Toggle layers top-left. Cameras and car parks are capped for performance; their tabs hold the full searchable lists.",
    loadingMap: "Loading map",
    kmh: "km/h",
    panels: [
      "Tai Po Rd · Sha Tin · SB near Racecourse",
      "Tate's Cairn Hwy · SB near Shek Mun",
      "Tolo Hwy · SB near Science Park",
      "New Territories panel 4",
      "New Territories panel 5",
    ],
  },
  common: {
    loading: "Loading",
    retry: "Retry",
    feedDown: "Feed down.",
    live: "LIVE",
    connecting: "connecting",
    search: "Search",
    all: "All",
    district: "District",
    allDistricts: "All districts",
    status: "Status",
    region: "Region",
    allRegions: "All regions",
    noMatch: "No incidents match.",
    nothingUnderFilters: "Nothing under these filters.",
    showingSlowest: (shown: number, total: number) => `Showing slowest ${shown} of ${total} detectors.`,
    near: "near",
    lanes: (n: number) => `${n} lanes`,
    tdImages: "TD IMAGES",
  },
  incidents: {
    kicker: "TD · Special traffic news 交通特別消息",
    title: "Incidents and closures",
    blurb: "Accidents, lane closures and special arrangements from the Transport Department. Refreshes about every minute.",
    searchLabel: "Search location / road",
    searchPh: "e.g. Cross-Harbour, Nathan Road…",
    optAll: (n: number) => `All (${n})`,
    optNew: "New / urgent",
    optOngoing: "Ongoing",
    optCleared: "Cleared",
    readMore: "Read full notice",
    showLess: "Show less",
  },
  journey: {
    kicker: "TD · Journey time indicators",
    title: "Journey times",
    blurb: "Drive-time estimates from TD sign sites to tunnel exits and NT destinations. Site and destination names follow TD and HKeMobility wording.",
    smooth: "smooth",
    slow: "slow",
    congested: "congested",
    originRegion: "Origin region",
    harbourOnly: "Harbour crossings only",
    capture: (t: string, a: string) => `TD capture ${t} · ${a}`,
    min: "min",
    from: "from",
  },
  cameras: {
    kicker: "TD · Traffic snapshots · ~1,000 CCTV",
    title: "CCTV stills",
    blurb: "Roadside camera stills from major roads. Frames sit on TD servers and refresh every few minutes.",
    stills: "STILLS",
    reload: "Reload frames",
    searchLabel: (n: number) => `Search · ${n} cameras`,
    searchPh: "e.g. Nathan Road, tunnel, H210F…",
    noMatch: "No cameras match.",
    prev: "← Prev",
    next: "Next →",
    page: (p: number, n: number) => `Page ${p} / ${n}`,
  },
  detectors: {
    kicker: "TD · Detector network 偵測器",
    title: "Speeds on major roads",
    blurb: "Volume-weighted speeds from around 800 road detectors, matched to road names. Congested under 25 km/h or occupancy over 50%.",
    congested: "congested",
    slow: "slow",
    smooth: "smooth",
    window: (d: string, f: string, t: string) => `window ${d} ${f}–${t} HKT`,
    searchLabel: "Search road / district",
    searchPh: "e.g. Gloucester, Tolo, Tsing Yi…",
    optCongestedFirst: "Congested first",
    thRoad: "Road / detector",
    thDistrict: "District",
    thSpeed: "Speed",
    thVolume: "Volume",
    thOcc: "Occup.",
    thStatus: "Status",
  },
  parking: {
    kicker: "One-stop parking 泊車 · ~590 car parks",
    title: "Car parks",
    blurb: "Live vacancies from the one-stop feed: TD car parks, Kowloon East smart parks, mall parks. EV and accessible bays where reported. Names follow the English feed.",
    searchLabel: (n: number) => `Search · ${n} car parks`,
    searchPh: "e.g. Tsim Sha Tsui, IFC, Tin Shui Wai…",
    vehicle: "Vehicle",
    spacesLabel: "Spaces",
    optAny: "Any",
    optHasSpace: "Has space",
    optLow: "Low (< 10)",
    optFull: "Full",
    noMatch: "No car parks match.",
    showMore: (n: number) => `Show more (${n} remaining)`,
    full: "Full",
    spaces: "spaces",
    noData: "no data",
    noFeed: "no live feed",
    upd: (a: string) => `upd ${a}`,
    ev: (n: number) => `EV ${n}`,
    accessible: (n: number) => `accessible ${n}`,
    operatorSite: "operator site",
  },
  roadworks: {
    kicker: "Highways Dept · closures on 70 km/h+ roads",
    title: "Roadworks",
    blurb: "Lane closures on faster roads, with the affected lanes and times.",
    active: (n: number) => `${n} ACTIVE`,
    searchLabel: "Search road / works",
    searchPh: "e.g. Tsing Yi, tunnel, resurfacing…",
    empty: "No roadworks on record right now.",
    scheduled: "Scheduled",
    bound: (b: string) => `${b} bound`,
  },
  buses: {
    kicker: "KMB · Citybus · GMB 實時到站",
    title: "Bus ETAs",
    blurb: "Next-bus times from the operators. Pick a route, a direction, a stop.",
    operator: "Operator",
    region: "Region",
    routeNo: "Route no.",
    routeNoIn: (n: number, r: string) => `Route no. · ${n} in ${r}`,
    hkIsland: "HK Island",
    kowloon: "Kowloon",
    newTerritories: "New Territories",
    findStops: "Find stops",
    direction: "Direction",
    outbound: "Outbound",
    inbound: "Inbound",
    stop: "Stop",
    nextBuses: "Next buses",
    noDepartures: "no departures",
    checkEta: "Check ETA",
    due: "due",
    min: (n: number) => `${n} min`,
    noRouteKmb: (q: string) => `No KMB/LWB route ${q} found.`,
    noRouteCtb: (q: string) => `No Citybus route ${q} found.`,
    noRouteGmb: (code: string, region: string) => `No GMB route ${code} in ${region}.`,
  },
  map: {
    loadingTiles: "Loading Hong Kong vector tiles",
    tilesDown: "Tile source unreachable. Check hk-pmtiles-generation Pages status.",
    detectors: "Detectors",
    roadworks: "Roadworks",
    cameras: "Cameras",
    parks: "Car parks",
    noVacancy: "no live vacancy",
    privateCarSpaces: (v: number) => `${v} private-car spaces`,
    vol: "vol",
    occ: "occ",
    bound: (b: string) => `${b} bound`,
  },
  footer: {
    kicker: "Open data sources 資料來源 · data.gov.hk",
    blurb:
      "Every number here comes from Transport Department and operator datasets on the open data portal. This app only proxies and reformats them. The congestion bands on the speed map are our own heuristic, everything else is published as-is. Not an official TD service.",
    uses: [
      "Incidents wire",
      "Journey times",
      "CCTV stills",
      "Motorway panels",
      "Detector speeds",
      "Parking one-stop",
      "Roadworks",
      "KMB / LWB ETA",
      "Citybus ETA",
      "Minibus ETA",
    ],
    signoff: "Visbyr Traffic 香港即時交通 · unofficial · MIT",
  },
};

export type Dict = typeof en;

const zh: Dict = {
  headerTagline: "運輸署開放數據直播",
  tabs: {
    overview: "總覽",
    incidents: "事故消息",
    journey: "行車時間",
    cameras: "交通快拍",
    speeds: "車速圖",
    parking: "泊車",
    roadworks: "道路工程",
    buses: "巴士",
    map: "實時地圖",
  },
  alertNew: "最新",
  alertLatest: "最新消息",
  overview: {
    glance: "全網一覽",
    kpiActive: "進行中事故",
    kpiActiveSub: "運輸署特別交通消息",
    kpiSlow: "車速緩慢偵測點",
    kpiSlowSubAll: (total: number) => `共監察 ${total} 個`,
    kpiSlowSub: "偵測器網絡",
    kpiWorst: "最擠塞過海通道",
    kpiWorstSub: "行車時間指標",
    kpiFull: "已滿停車場",
    kpiFullSub: "私家車位",
    latestWire: "最新消息",
    slowest: "最慢路段",
    viewAll: "查看全部",
    fullTable: "完整列表",
    gantry: "龍門架資訊",
    gantryBlurb: "沙田入口告示板，直接取自運輸署圖像。",
    deeper: "深入查看",
    quickCctv: "交通快拍",
    quickCctvDesc: "上千個路邊攝影機",
    quickParks: "停車場",
    quickParksDesc: "即時空位",
    quickBuses: "巴士到站",
    quickBusesDesc: "九巴 · 城巴 · 專線小巴",
    quickMap: "實時地圖",
    quickMapDesc: "偵測器及工程",
    mapNote: "在左上角切換圖層。攝影機和停車場為顧及效能只顯示部分；完整可搜尋列表請見各分頁。",
    loadingMap: "載入地圖",
    kmh: "公里/小時",
    panels: [
      "大埔公路 · 沙田 · 南行近馬場",
      "大老山公路 · 南行近石門",
      "吐露港公路 · 南行近科學園",
      "新界告示板 4",
      "新界告示板 5",
    ],
  },
  common: {
    loading: "載入中",
    retry: "重試",
    feedDown: "數據源故障。",
    live: "直播中",
    connecting: "連接中",
    search: "搜尋",
    all: "全部",
    district: "地區",
    allDistricts: "全部地區",
    status: "狀態",
    region: "區域",
    allRegions: "全部區域",
    noMatch: "沒有符合的事故。",
    nothingUnderFilters: "篩選下沒有結果。",
    showingSlowest: (shown: number, total: number) => `共 ${total} 個偵測器，顯示最慢 ${shown} 個。`,
    near: "近",
    lanes: (n: number) => `${n} 線`,
    tdImages: "運輸署圖像",
  },
  incidents: {
    kicker: "運輸署 · 特別交通消息",
    title: "事故及封路",
    blurb: "運輸署發佈的意外、封線及特別安排，約每分鐘更新。",
    searchLabel: "搜尋地點 / 道路",
    searchPh: "例如：紅隧、彌敦道…",
    optAll: (n: number) => `全部 (${n})`,
    optNew: "最新 / 緊急",
    optOngoing: "處理中",
    optCleared: "已清理",
    readMore: "閱讀完整通告",
    showLess: "收起",
  },
  journey: {
    kicker: "運輸署 · 行車時間指標",
    title: "行車時間",
    blurb: "由運輸署告示板地點至隧道出口及新界目的地的預計車程，中文名稱為本站翻譯。",
    smooth: "暢順",
    slow: "緩慢",
    congested: "擠塞",
    originRegion: "起點區域",
    harbourOnly: "只顯示過海路線",
    capture: (t: string, a: string) => `運輸署採集 ${t} · ${a}`,
    min: "分鐘",
    from: "由",
  },
  cameras: {
    kicker: "運輸署 · 交通快拍 · 約 1,000 個閉路電視",
    title: "交通快拍",
    blurb: "主要道路的路邊攝影機截圖。圖像存放於運輸署伺服器，每幾分鐘更新。",
    stills: "快拍",
    reload: "重新載入圖像",
    searchLabel: (n: number) => `搜尋 · 共 ${n} 部攝影機`,
    searchPh: "例如：彌敦道、隧道、H210F…",
    noMatch: "沒有符合的攝影機。",
    prev: "← 上一頁",
    next: "下一頁 →",
    page: (p: number, n: number) => `第 ${p} / ${n} 頁`,
  },
  detectors: {
    kicker: "運輸署 · 偵測器網絡",
    title: "主要道路車速",
    blurb: "約 800 個道路偵測器的加權車速，已配對道路名稱。低於每小時 25 公里或佔用率高於 50% 即視為擠塞。路名沿用英文資料。",
    congested: "擠塞",
    slow: "緩慢",
    smooth: "暢順",
    window: (d: string, f: string, t: string) => `時段 ${d} ${f}–${t} 香港時間`,
    searchLabel: "搜尋道路 / 地區",
    searchPh: "例如：告士打道、吐露港、青衣…",
    optCongestedFirst: "先顯示擠塞",
    thRoad: "道路 / 偵測器",
    thDistrict: "地區",
    thSpeed: "車速",
    thVolume: "流量",
    thOcc: "佔用率",
    thStatus: "狀態",
  },
  parking: {
    kicker: "一站式泊車 · 約 590 個停車場",
    title: "停車場",
    blurb: "一站式數據的即時空位：運輸署停車場、九東智慧停車場、商場停車場。有上報即顯示電動車及無障礙車位。名稱沿用英文資料。",
    searchLabel: (n: number) => `搜尋 · 共 ${n} 個停車場`,
    searchPh: "例如：尖沙咀、IFC、天水圍…",
    vehicle: "車種",
    spacesLabel: "空位",
    optAny: "全部",
    optHasSpace: "有空位",
    optLow: "緊張 (< 10)",
    optFull: "已滿",
    noMatch: "沒有符合的停車場。",
    showMore: (n: number) => `顯示更多 (尚餘 ${n} 個)`,
    full: "已滿",
    spaces: "個空位",
    noData: "無數據",
    noFeed: "無即時數據",
    upd: (a: string) => `${a}更新`,
    ev: (n: number) => `電動車 ${n}`,
    accessible: (n: number) => `無障礙 ${n}`,
    operatorSite: "營運商網站",
  },
  roadworks: {
    kicker: "路政署 · 時速 70 公里或以上道路封線",
    title: "道路工程",
    blurb: "車速較快道路的行車線封閉，包括受影響行車線及時間。",
    active: (n: number) => `進行中 ${n} 宗`,
    searchLabel: "搜尋道路 / 工程",
    searchPh: "例如：青衣、隧道、重鋪…",
    empty: "目前沒有道路工程紀錄。",
    scheduled: "已安排",
    bound: (b: string) => `${b}`,
  },
  buses: {
    kicker: "九巴 · 城巴 · 專線小巴實時到站",
    title: "巴士到站時間",
    blurb: "營運商提供的下班車時間。選擇路線、方向、車站。",
    operator: "營運商",
    region: "區域",
    routeNo: "路線編號",
    routeNoIn: (n: number, r: string) => `路線編號 · ${r}共 ${n} 條`,
    hkIsland: "港島",
    kowloon: "九龍",
    newTerritories: "新界",
    findStops: "尋找車站",
    direction: "方向",
    outbound: "去程",
    inbound: "回程",
    stop: "車站",
    nextBuses: "下班車",
    noDepartures: "暫無班次",
    checkEta: "查到站時間",
    due: "即到",
    min: (n: number) => `${n} 分鐘`,
    noRouteKmb: (q: string) => `找不到九巴/龍運路線 ${q}。`,
    noRouteCtb: (q: string) => `找不到城巴路線 ${q}。`,
    noRouteGmb: (code: string, region: string) => `在${region}找不到專線小巴路線 ${code}。`,
  },
  map: {
    loadingTiles: "載入香港向量圖磚",
    tilesDown: "圖磚來源無法連接，請檢查 hk-pmtiles-generation Pages 狀態。",
    detectors: "偵測器",
    roadworks: "道路工程",
    cameras: "攝影機",
    parks: "停車場",
    noVacancy: "無即時空位",
    privateCarSpaces: (v: number) => `${v} 個私家車位`,
    vol: "流量",
    occ: "佔用率",
    bound: (b: string) => `${b}`,
  },
  footer: {
    kicker: "開放數據來源 · data.gov.hk",
    blurb: "這裡每個數字都來自資料一線通上的運輸署及營運商數據集，本應用只作代理及重整。車速圖上的擠塞分級是我們自設的估算，其餘一律原文刊載。並非運輸署官方服務。",
    uses: [
      "事故消息",
      "行車時間",
      "交通快拍",
      "高速公路告示板",
      "偵測器車速",
      "一站式泊車",
      "道路工程",
      "九巴 / 龍運到站",
      "城巴到站",
      "小巴到站",
    ],
    signoff: "Visbyr Traffic 香港即時交通 · 非官方 · MIT",
  },
};

const dicts: Record<Locale, Dict> = { en, zh };

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const Ctx = createContext<LocaleCtx>({ locale: "en", setLocale: () => {}, t: en });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // Intentional post-hydration restore: SSR always renders English so the
    // first paint matches, then the stored (or browser) locale applies.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "zh") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(stored);
        return;
      }
      if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) {
        setLocaleState("zh");
      }
    } catch {
      /* private mode: stay on English */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ locale, setLocale, t: dicts[locale] }}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  return useContext(Ctx);
}

/** Pick the dataset-provided Chinese string when locale is zh, else English. */
export function pick(enStr: string, tcStr: string | null | undefined, locale: Locale): string {
  if (locale === "zh" && tcStr) return tcStr;
  return enStr;
}

/** BCP-47 tag for Intl formatting. */
export function intlLocale(locale: Locale): string {
  return locale === "zh" ? "zh-HK" : "en-HK";
}
