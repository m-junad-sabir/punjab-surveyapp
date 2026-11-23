// Provisional Punjab envelope from documentation/workplan-to-solve-issues-3.md (section 3).
// Pending owner approval (Phase 0). Replace with district/province polygons when geom is loaded.
export const PUNJAB_BOUNDS = {
  minLat: 27.6,
  maxLat: 34.1,
  minLng: 69.2,
  maxLng: 75.5,
} as const;

export function isInsidePunjab(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= PUNJAB_BOUNDS.minLat &&
    latitude <= PUNJAB_BOUNDS.maxLat &&
    longitude >= PUNJAB_BOUNDS.minLng &&
    longitude <= PUNJAB_BOUNDS.maxLng
  );
}