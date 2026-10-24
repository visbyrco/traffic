# Visbyr Traffic

Live Hong Kong traffic conditions, built on [DATA.GOV.HK](https://data.gov.hk) open datasets.
A night-ops style dashboard: incident wire, journey times, ~1,000 CCTV stills, detector
speed map, parking vacancies, roadworks, bus ETAs and a live map.

## What information, and why

Every panel maps to a real dataset that was verified live before building:

| Panel | Dataset (`data.gov.hk` id) | Why this one |
|---|---|---|
| Incidents wire | `hk-td-tis_19-special-traffic-news-v2` | Only authoritative live accident/closure feed (XML, ~1 min updates) |
| Journey times | `hk-td-sm_8-journey-time-indicators-v2` | Estimated drive times to harbour crossings + NT destinations |
| Cameras | `hk-td-tis_2-traffic-snapshot-images` | ~1,000 CCTV stills with lat/lng location file |
| Motorway panels | `hk-td-sm_9-speed-map-panels-v2` | The same Sha Tin approach signs drivers see |
| Speed map | `hk-td-sm_4-traffic-data-strategic-major-roads` | ~800 detectors (speed/volume/occupancy) joined to road names |
| Parking | `hk-dpo-datagovhk1-carpark-info-vacancy` | ~590 car parks via the one-stop info + vacancy API, incl. EV and accessible bays |
| Roadworks | `hk-td-tis_18-roadworks-location` | Lane closures on 70 km/h+ roads, with times |
| Buses | `hk-td-tis_21-etakmb`, `ctb-eta-transport-realtime-eta`, `hk-td-sm_7-real-time-arrival-data-of-gmb` | KMB/LWB, Citybus, GMB realtime ETAs |

Deliberately left out: `hk-td-sm_1-traffic-speed-map` (deprecated pointer file),
TDAS route API (returns errors), annual car-journey-time spreadsheets (static,
not live), traffic notices XML (static gazette-style notices, low signal).

All TD endpoints are proxied through Next.js route handlers (`src/app/api/*`)
with staggered `revalidate` caches, so the browser never hits CORS issues and
upstream gets polite traffic. Colour chips on journey times are TD's own codes;
status bands on the detector map are our heuristic and labelled as such.

The live map renders vector tiles from
[timothy0509/hk-pmtiles-generation](https://github.com/timothy0509/hk-pmtiles-generation)
(`hong-kong.pmtiles` with its dark style) via MapLibre GL. Tiles are Produced
Works of the OpenStreetMap dataset under the Open Database License, attributed
on the map.

## Develop

```bash
pnpm install   # build scripts are approved in pnpm-workspace.yaml (tailwind oxide, sharp)
pnpm dev
```

`public/maplibre-gl-worker.mjs` is a copy of the MapLibre GL web worker from
the installed `maplibre-gl` package. Turbopack does not emit the worker chunk where MapLibre
expects it, so the app serves this copy and points `config.WORKER_URL` at it
(see `src/components/TrafficMap.tsx`). Re-copy it after upgrading
`maplibre-gl`:

```bash
cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/maplibre-gl-worker.mjs
```

## Deploy to Vercel

No special config. Either:

- **Dashboard:** import this repo at <https://vercel.com/new>, framework preset
  auto-detects Next.js, deploy.
- **CLI:** `pnpm add -g vercel && vercel --prod` from the repo root.

Environment variables: none. All data comes from public endpoints at request time.
