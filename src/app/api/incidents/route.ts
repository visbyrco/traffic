import { fetchText, parseIncidents } from "@/lib/td";

export const revalidate = 60;

export async function GET() {
  try {
    const xml = await fetchText("https://www.td.gov.hk/en/special_news/trafficnews.xml");
    const incidents = parseIncidents(xml);
    return Response.json({ updatedAt: new Date().toISOString(), count: incidents.length, incidents });
  } catch (e) {
    return Response.json(
      { error: `Special traffic news feed unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
