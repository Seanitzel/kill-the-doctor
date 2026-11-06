// A bounded, validated outfit palette shared by shirts and trousers.
export const MAX_SAVED_COLORS = 5;
export function normalizeSavedColors(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .filter((v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v))
        .map((v) => v.toLowerCase()),
    ),
  ].slice(0, MAX_SAVED_COLORS);
}
export function saveOutfitColor(save, color) {
  const colors = normalizeSavedColors(save.savedOutfitColors);
  if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color)) return false;
  color = color.toLowerCase();
  if (colors.includes(color)) return true;
  if (colors.length >= MAX_SAVED_COLORS) return false;
  save.savedOutfitColors = [...colors, color];
  return true;
}
export function removeOutfitColor(save, color) {
  save.savedOutfitColors = normalizeSavedColors(save.savedOutfitColors).filter(
    (c) => c !== color,
  );
}
