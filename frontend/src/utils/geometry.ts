type GeometryLike = {
  type?: string;
  coordinates?: unknown;
};

const flatCoords = (coords: unknown): number[][] => {
  if (!Array.isArray(coords) || coords.length === 0) return [];
  if (typeof coords[0] === "number") return [coords as number[]];
  return coords.flatMap((c) => flatCoords(c));
};

export function getEntityCenter(
  geometry: unknown,
): { lng: number; lat: number } | null {
  const geo = geometry as GeometryLike | null;
  if (!geo?.type || !geo?.coordinates) return null;

  const points = flatCoords(geo.coordinates);
  if (points.length === 0) return null;

  if (geo.type === "Point" && points.length === 1) {
    return { lng: points[0][0], lat: points[0][1] };
  }

  const sum = points.reduce(
    (acc, p) => ({ lng: acc.lng + p[0], lat: acc.lat + p[1] }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / points.length, lat: sum.lat / points.length };
}

export function fmtCoord(n: number): string {
  return n.toFixed(6);
}
