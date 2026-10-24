import { fetchText, normalizeRoadworks } from "@/lib/td";

export const revalidate = 300;

export async function GET() {
  try {
    const text = await fetchText(
      "https://resource.data.one.gov.hk/td/roadworks-location/get_all_the_roadworks.json",
    );
    const roadworks = normalizeRoadworks(JSON.parse(text));
    return Response.json({ updatedAt: new Date().toISOString(), count: roadworks.length, roadworks });
  } catch (e) {
    return Response.json(
      { error: `Roadworks feed unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
