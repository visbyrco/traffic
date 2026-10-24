import { fetchText, parseJourney } from "@/lib/td";

export const revalidate = 120;

export async function GET() {
  try {
    const xml = await fetchText("https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml");
    const readings = parseJourney(xml);
    const capturedAt = readings[0]?.capturedAt ?? null;
    return Response.json({ updatedAt: new Date().toISOString(), capturedAt, count: readings.length, readings });
  } catch (e) {
    return Response.json(
      { error: `Journey time feed unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
