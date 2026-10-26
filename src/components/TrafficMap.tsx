"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import { config as mlConfig } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { pick, useLocale } from "@/lib/i18n";
import { districtDisplay } from "@/lib/td";
import type { Camera, CarPark, Roadwork } from "@/lib/td";
import type { DetectorPoint } from "./panels-roads";

const TILE_BASE = "https://timothy0509.github.io/hk-pmtiles-generation";
const STYLE_DARK_URL =
  "https://raw.githubusercontent.com/timothy0509/hk-pmtiles-generation/main/render-style-dark.json";
const STYLE_LIGHT_URL =
  "https://raw.githubusercontent.com/timothy0509/hk-pmtiles-generation/main/render-style.json";

function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.classList.contains("dark")) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const PALETTE = {
  light: { good: "#18794e", warn: "#8a5a00", bad: "#b3261e", accent: "#0d4a50", grey: "#8a9596", stroke: "#ffffff" },
  dark: { good: "#6fce97", warn: "#e5b45a", bad: "#ef8f88", accent: "#8fd2d6", grey: "#6b7677", stroke: "#121515" },
};

let protocolRegistered = false;
function ensureProtocol() {
  if (!protocolRegistered) {
    // Turbopack does not emit the worker chunk next to the main chunk, so
    // point MapLibre at a copy served from public/ instead.
    mlConfig.WORKER_URL = "/maplibre-gl-worker.mjs";
    maplibregl.addProtocol("pmtiles", new Protocol().tile);
    protocolRegistered = true;
  }
}

type LayerId = "detectors" | "cameras" | "parks" | "roadworks";

const LAYER_IDS = ["detectors", "roadworks", "cameras", "parks"] as const;
const LAYER_DEFAULTS: Record<LayerId, boolean> = {
  detectors: true,
  roadworks: true,
  cameras: false,
  parks: false,
};

function parkVacancy(p: CarPark): number | null {
  const v = p.vacancies.find((x) => x.vehicle === "privateCar") ?? p.vacancies.find((x) => x.vehicle === "P") ?? p.vacancies[0];
  return v ? v.vacancy : null;
}

export default function TrafficMap({
  cameras, detectors, parks, roadworks,
}: {
  cameras: Camera[]; detectors: DetectorPoint[]; parks: CarPark[]; roadworks: Roadwork[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [layers, setLayers] = useState<Record<LayerId, boolean>>(LAYER_DEFAULTS);
  const { locale, t } = useLocale();

  const geo = useMemo(() => {
    const fc = (features: object[]): GeoJSON.FeatureCollection => ({
      type: "FeatureCollection", features: features as GeoJSON.Feature[],
    });
    return {
      detectors: fc(
        detectors.filter((d) => d.lat && d.lng).slice(0, 1600).map((d) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [d.lng, d.lat] },
          properties: {
            title: d.road, sub: `${d.avgSpeed} km/h · ${t.map.vol} ${d.volume}/30s · ${t.map.occ} ${d.maxOcc}%`,
            meta: `${districtDisplay(d.district, locale)} · ${d.id}`, status: d.status,
          },
        })),
      ),
      cameras: fc(
        cameras.filter((c) => c.lat && c.lng).slice(0, 250).map((c) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lng, c.lat] },
          properties: { title: `${c.key} · ${c.description}`, img: c.url, meta: `${c.region} · ${c.district}`, kind: "camera" },
        })),
      ),
      parks: fc(
        parks.filter((p) => p.lat && p.lng).slice(0, 300).map((p) => {
          const v = parkVacancy(p);
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
            properties: {
              title: p.name,
              sub: v == null ? t.map.noVacancy : t.map.privateCarSpaces(v),
              meta: districtDisplay(p.district, locale),
              vacancy: v == null ? "none" : v <= 0 ? "full" : v < 10 ? "low" : "open",
            },
          };
        }),
      ),
      roadworks: fc(
        roadworks.filter((r) => r.lat && r.lng).map((r) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [r.lng, r.lat] },
          properties: {
            title: pick(r.road, r.roadTc, locale), sub: pick(r.detail, r.detailTc, locale),
            meta: `${t.map.bound(pick(r.bound, r.boundTc, locale))} · ${pick(r.lane, r.laneTc, locale)} · ${r.start} → ${r.end}`, kind: "works",
          },
        })),
      ),
    };
  }, [cameras, detectors, parks, roadworks, t, locale]);

  // Init once.
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    let cancelled = false;
    let map: maplibregl.Map | null = null;
    (async () => {
      try {
        ensureProtocol();
        const prefersDark = isDarkMode();
        const urls = prefersDark ? [STYLE_DARK_URL, STYLE_LIGHT_URL] : [STYLE_LIGHT_URL, STYLE_DARK_URL];
        let style: maplibregl.StyleSpecification | null = null;
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (r.ok) { style = await r.json(); break; }
          } catch { /* try next */ }
        }
        if (!style) throw new Error("style unreachable");
        (style.sources as Record<string, { url?: string }>)["protomaps"].url = `pmtiles://${TILE_BASE}/hong-kong.pmtiles`;
        if (cancelled || !el.current) return;
        map = new maplibregl.Map({
          container: el.current,
          style,
          center: [114.1694, 22.3193],
          zoom: 10.5,
          minZoom: 9,
          maxBounds: [[113.7, 22.05], [114.55, 22.65]],
          attributionControl: false,
        });
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
        map.addControl(
          new maplibregl.AttributionControl({ compact: true, customAttribution: "© OpenStreetMap · tiles: timothy0509/hk-pmtiles-generation" }),
          "bottom-right",
        );
        const pal = prefersDark ? PALETTE.dark : PALETTE.light;
        const LAYER_COLOR: Record<LayerId, maplibregl.ExpressionSpecification> = {
          detectors: ["match", ["get", "status"], "congested", pal.bad, "slow", pal.warn, pal.good] as unknown as maplibregl.ExpressionSpecification,
          cameras: pal.accent as unknown as maplibregl.ExpressionSpecification,
          parks: ["match", ["get", "vacancy"], "full", pal.bad, "low", pal.warn, "open", pal.good, pal.grey] as unknown as maplibregl.ExpressionSpecification,
          roadworks: pal.warn as unknown as maplibregl.ExpressionSpecification,
        };
        map.on("load", () => {
          if (cancelled || !map) return;
          for (const id of ["detectors", "cameras", "parks", "roadworks"] as const) {
            map.addSource(id, { type: "geojson", data: geo[id] });
            map.addLayer({
              id, type: "circle", source: id,
              paint: {
                "circle-radius": 5,
                "circle-color": LAYER_COLOR[id],
                "circle-stroke-width": 1.5,
                "circle-stroke-color": pal.stroke,
                "circle-opacity": 0.9,
              },
            });
            map.on("click", id, (e) => {
              const f = e.features?.[0];
              if (!f || !map) return;
              const p = f.properties as { title: string; sub?: string; meta?: string; img?: string };
              new maplibregl.Popup({ closeButton: false, maxWidth: "260px" })
                .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
                .setHTML(
                  `<strong>${escapeHtml(p.title)}</strong>` +
                  (p.sub ? `<br/>${escapeHtml(p.sub)}` : "") +
                  (p.img ? `<br/><img src="${p.img}" alt="" loading="lazy" style="width:220px;margin-top:6px;border-radius:4px"/>` : "") +
                  (p.meta ? `<br/><span style="color:var(--vis-muted)">${escapeHtml(p.meta)}</span>` : ""),
                )
                .addTo(map);
            });
            map.on("mouseenter", id, () => { if (map) map.getCanvas().style.cursor = "pointer"; });
            map.on("mouseleave", id, () => { if (map) map.getCanvas().style.cursor = ""; });
            if (!LAYER_DEFAULTS[id]) map.setLayoutProperty(id, "visibility", "none");
          }
          mapRef.current = map;
          setStatus("ready");
        });
        map.on("error", () => { if (!cancelled) setStatus((s) => (mapRef.current ? s : "error")); });
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push fresh data into sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    for (const id of ["detectors", "cameras", "parks", "roadworks"] as const) {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(geo[id]);
    }
  }, [geo, status]);

  // Toggle visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    for (const id of ["detectors", "cameras", "parks", "roadworks"] as const) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", layers[id] ? "visible" : "none");
    }
  }, [layers, status]);

  const layerLabel = (id: LayerId) =>
    id === "detectors" ? t.map.detectors : id === "roadworks" ? t.map.roadworks : id === "cameras" ? t.map.cameras : t.map.parks;

  return (
    <div className="relative">
      <div ref={el} className="h-[62vh] min-h-[420px] w-full rounded-[10px] bg-wash" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-wash text-sm text-muted">
          {status === "loading" ? t.map.loadingTiles : t.map.tilesDown}
        </div>
      )}
      {status === "ready" && (
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {LAYER_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setLayers((s) => ({ ...s, [id]: !s[id] }))}
              className={`type-data rounded-md border px-2.5 py-1 backdrop-blur transition ${layers[id] ? "border-ink bg-card/95 text-ink" : "border-hairline bg-card/95 text-muted"}`}
            >
              {layerLabel(id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
