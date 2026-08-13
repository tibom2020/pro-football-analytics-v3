/**
 * Thu thập match-v2 (data/v2).
 * - `npm run dev` (Vite DEV): bật mặc định
 * - Build production / VPS: tắt mặc định
 * Ghi đè: VITE_FEATURE_MATCH_V2=true|false
 */
export function isMatchV2CaptureEnabled(): boolean {
  const flag = import.meta.env.VITE_FEATURE_MATCH_V2;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return import.meta.env.DEV === true;
}
