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

// Category palettes are independent. Legacy shared swatches are copied once per
// category on read; later writes never change another category or its default.
export const COLOR_CATEGORIES=['accent','pants','hair','skin','eyes','highlights'];
export function categoryColors(save,key){
  if(!COLOR_CATEGORIES.includes(key))return [];
  if(Object.hasOwn(save.colorPalettes||{},key))return normalizeSavedColors(save.colorPalettes[key]);
  return ['accent','pants'].includes(key)?normalizeSavedColors(save.savedOutfitColors):[];
}
export function normalizeColorPalettes(save){return Object.fromEntries(COLOR_CATEGORIES.map(key=>[key,categoryColors(save,key)]));}
export function saveCategoryDefault(save,key,color){
  if(!COLOR_CATEGORIES.includes(key)||typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))return false;
  color=color.toLowerCase();save.colorPalettes=normalizeColorPalettes(save);
  save.colorPalettes[key]=[...categoryColors(save,key).filter(c=>c!==color),color].slice(-MAX_SAVED_COLORS);
  save.colorDefaults={...save.colorDefaults,[key]:color};save.appearance[key]=color;return true;
}
export function removeCategoryColor(save,key,color){if(!COLOR_CATEGORIES.includes(key))return;save.colorPalettes=normalizeColorPalettes(save);save.colorPalettes[key]=categoryColors(save,key).filter(c=>c!==color);}
