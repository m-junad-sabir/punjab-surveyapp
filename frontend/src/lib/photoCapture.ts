export const MAX_PHOTO_ACCURACY_M = 250;
export const PHOTO_ACCURACY_WARNING_M = 50;

export function photoMetadataError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'Capture a photo with valid location metadata.';
  }
  const metadata = value as Record<string, unknown>;
  const { latitude, longitude, accuracy_m, captured_at } = metadata;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return 'Valid capture coordinates are required.';
  }
  if (typeof accuracy_m !== 'number' || !Number.isFinite(accuracy_m) ||
      accuracy_m < 0 || accuracy_m > MAX_PHOTO_ACCURACY_M) {
    return `GPS accuracy must be between 0 and ${MAX_PHOTO_ACCURACY_M} m. Improve the location fix and retake the photo.`;
  }
  if (typeof captured_at !== 'string' || !captured_at.trim() || Number.isNaN(Date.parse(captured_at))) {
    return 'A valid photo capture timestamp is required.';
  }
  return null;
}
