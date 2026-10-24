import { fetchText, parseCameras } from "@/lib/td";

export const revalidate = 86400;

export async function GET() {
  try {
    const xml = await fetchText(
      "https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml",
    );
    const cameras = parseCameras(xml);
    return Response.json({ updatedAt: new Date().toISOString(), count: cameras.length, cameras });
  } catch (e) {
    return Response.json(
      { error: `Camera list unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
