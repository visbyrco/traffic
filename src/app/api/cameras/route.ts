import { fetchText, parseCameras } from "@/lib/td";

export const revalidate = 86400;

const FEEDS = {
  en: "https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml",
  zh: "https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Tc.xml",
} as const;

export async function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang") === "zh" ? "zh" : "en";
  try {
    const xml = await fetchText(FEEDS[lang]);
    const cameras = parseCameras(xml);
    return Response.json({ updatedAt: new Date().toISOString(), count: cameras.length, cameras });
  } catch (e) {
    return Response.json(
      { error: `Camera list unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
