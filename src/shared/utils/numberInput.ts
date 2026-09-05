// Shared by every screen with a free-text numeric field backed by a nullable DB column
// (sets/reps/weight): blank input is a deliberate "unset" rather than 0, and anything that
// doesn't parse is treated the same way rather than surfacing a parse error inline.
export function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function toNullableFloat(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}
