import { fetchText } from "@/lib/td";

export const revalidate = 30;

const BASES: Record<string, string> = {
  kmb: "https://data.etabus.gov.hk/v1/transport/kmb",
  ctb: "https://rt.data.gov.hk/v1/transport/citybus-nwfb",
  gmb: "https://data.etagmb.gov.hk",
};

/** Generic passthrough for KMB/LWB, Citybus and GMB realtime APIs.
    Example: /api/bus/kmb?path=/route-eta/101/1 ; /api/bus/ctb?path=/eta/ctb/12345/1 */
export async function GET(
  req: Request,
  ctx: RouteContext<"/api/bus/[co]">,
) {
  const { co } = await ctx.params;
  const base = BASES[co];
  if (!base) return Response.json({ error: "Unknown operator. Use kmb, ctb or gmb." }, { status: 400 });
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path.startsWith("/") || path.includes("..") || /[<>"'\\]/.test(path)) {
    return Response.json({ error: "Invalid path parameter." }, { status: 400 });
  }
  try {
    const text = await fetchText(`${base}${path}`, 15000);
    return Response.json(JSON.parse(text));
  } catch (e) {
    return Response.json(
      { error: `Operator feed unavailable: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
