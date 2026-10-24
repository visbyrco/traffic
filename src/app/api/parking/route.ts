import { fetchText, mergeParking } from "@/lib/td";

export const revalidate = 60;

const INFO_URL = "https://api.data.gov.hk/v1/carpark-info-vacancy";
const VACANCY_URL = "https://api.data.gov.hk/v1/carpark-info-vacancy?data=vacancy";

export async function GET() {
  try {
    const [infoText, vacancyText] = await Promise.all([
      fetchText(INFO_URL, 30000),
      fetchText(VACANCY_URL),
    ]);
    const parks = mergeParking(JSON.parse(infoText), JSON.parse(vacancyText));
    return Response.json({ updatedAt: new Date().toISOString(), count: parks.length, parks });
  } catch (e) {
    return Response.json(
      { error: `Parking feed unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
