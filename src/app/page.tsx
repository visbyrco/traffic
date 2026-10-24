import Dashboard from "@/components/Dashboard";

const SOURCES = [
  { id: "hk-td-tis_19-special-traffic-news-v2", use: "Incidents wire" },
  { id: "hk-td-sm_8-journey-time-indicators-v2", use: "Journey times" },
  { id: "hk-td-tis_2-traffic-snapshot-images", use: "CCTV stills" },
  { id: "hk-td-sm_9-speed-map-panels-v2", use: "Motorway panels" },
  { id: "hk-td-sm_4-traffic-data-strategic-major-roads", use: "Detector speeds" },
  { id: "hk-dpo-datagovhk1-carpark-info-vacancy", use: "Parking one-stop" },
  { id: "hk-td-tis_18-roadworks-location", use: "Roadworks" },
  { id: "hk-td-tis_21-etakmb", use: "KMB / LWB ETA" },
  { id: "ctb-eta-transport-realtime-eta", use: "Citybus ETA" },
  { id: "hk-td-sm_7-real-time-arrival-data-of-gmb", use: "Minibus ETA" },
];

export default function Page() {
  return (
    <main>
      <Dashboard />
      <footer className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="font-gmono flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-stone-400">
            <span className="inline-block h-2 w-2 bg-vms-400" aria-hidden />
            <span>Open data sources 資料來源 · data.gov.hk</span>
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-stone-500">
            Every number here comes from Transport Department and operator datasets on the open data portal.
            This app only proxies and reformats them. The congestion bands on the speed map are our own
            heuristic, everything else is published as-is. Not an official TD service.
          </p>
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((s) => (
              <li key={s.id}>
                <a
                  href={`https://data.gov.hk/en-data/dataset/${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-gmono block truncate rounded-[5px] border border-line px-3 py-2 text-[11px] text-stone-400 transition hover:border-vms-400/50 hover:text-vms-300"
                  title={s.id}
                >
                  <span className="text-stone-200">{s.use}</span> · {s.id}
                </a>
              </li>
            ))}
          </ul>
          <p className="font-gmono mt-6 text-[11px] text-stone-600">Visbyr Traffic 香港即時交通 · unofficial · MIT</p>
        </div>
      </footer>
    </main>
  );
}
