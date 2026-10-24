import {
  detectorStatus,
  fetchText,
  parseDetectorInfo,
  parseRawSpeedVol,
} from "@/lib/td";

export const revalidate = 120;

export async function GET() {
  try {
    const [infoCsv, rawXml] = await Promise.all([
      fetchText("https://static.data.gov.hk/td/traffic-data-strategic-major-roads/info/traffic_speed_volume_occ_info.csv"),
      fetchText("https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml"),
    ]);
    const meta = parseDetectorInfo(infoCsv);
    const { date, from, to, detectors } = parseRawSpeedVol(rawXml);
    const points = detectors.map((d) => {
      const m = meta.get(d.id);
      return {
        ...d,
        status: detectorStatus(d),
        road: m?.road ?? d.id,
        district: m?.district ?? "",
        lat: m?.lat ?? 0,
        lng: m?.lng ?? 0,
        direction: m?.direction ?? "",
      };
    });
    return Response.json({
      updatedAt: new Date().toISOString(),
      window: { date, from, to },
      count: points.length,
      points,
    });
  } catch (e) {
    return Response.json(
      { error: `Detector feed unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
