// Shared fictional gameplay rules, independent of role, weapon or renderer.
export const LETHAL_REGIONS = new Set(['head', 'neck', 'chest']);
export const NONLETHAL_LIMIT = 3;
export function applyInjury(previous, hit) {
  const state = previous || {hits:0, wounds:[], dead:false};
  if (state.dead) return state;
  const lethal = LETHAL_REGIONS.has(hit.part), hits = state.hits + Number(!lethal);
  return {hits, wounds:[...state.wounds, {part:hit.part, side:hit.side || 'Right'}].slice(-3), dead:lethal || hits>=NONLETHAL_LIMIT, cause:lethal?hit.part:hits>=NONLETHAL_LIMIT?'blood-loss':null};
}
export function injurySpeed(state) {
  if (state?.dead) return 0;
  return state?.wounds?.reduce((scale,w)=>Math.min(scale,w.part==='leg'?.42:['hips','back'].includes(w.part)?.58:1),1) ?? 1;
}
export function injuryLabel(state) {
  if(!state?.wounds?.length)return '';
  const mobility=injurySpeed(state)<1;
  return `${mobility?'Movement impaired':'Arm injured'} · ${state.hits}/3 non-lethal hits`;
}
