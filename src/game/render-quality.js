// Resolution and smoothing are independent from shared texture/cache budgets.
// The pixel ceiling also bounds both owned postprocessing render targets.
export const MOBILE_PIXEL_BUDGET = 1_200_000;
const PHONE_RATIOS = {low: 1, balanced: 1.25, high: 1.5};
const DESKTOP_RATIOS = {low: 1, balanced: 1.25, high: 1.7};

export function renderPixelRatio({mobile = false, quality = 'balanced', deviceRatio = 1, width = 0, height = 0}) {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const target = (mobile ? PHONE_RATIOS : DESKTOP_RATIOS)[quality] ?? 1.25;
  const budget = mobile && width > 0 && height > 0
    ? Math.sqrt(MOBILE_PIXEL_BUDGET / (width * height))
    : Infinity;
  return Math.min(ratio, target, budget);
}
