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
      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="type-eyebrow text-muted">
            Open data sources 資料來源 · data.gov.hk
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            Every number here comes from Transport Department and operator datasets on the open data portal.
            This app only proxies and reformats them. The congestion bands on the speed map are our own
            heuristic, everything else is published as-is. Not an official TD service.
          </p>
          <ul className="mt-5 border-t border-hairline">
            {SOURCES.map((s) => (
              <li key={s.id} className="border-b border-hairline">
                <a
                  href={`https://data.gov.hk/en-data/dataset/${s.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="type-data row-hover flex flex-wrap gap-x-3 py-2 text-muted hover:text-accent"
                  title={s.id}
                >
                  <span className="font-medium text-ink">{s.use}</span>
                  <span className="truncate">{s.id}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="type-data mt-6 text-muted">Visbyr Traffic 香港即時交通 · unofficial · MIT</p>
        </div>
      </footer>
    </main>
  );
}
