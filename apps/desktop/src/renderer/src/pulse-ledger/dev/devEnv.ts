/**
 * Dev-only UI flags. Production builds hide these unless explicitly enabled.
 */
export function showDevDataSourceStatus(): boolean {
  const v = import.meta.env.VITE_SHOW_API_STATUS;
  if (v === '0' || v === 'false') return false;
  if (v === '1' || v === 'true') return true;
  return Boolean(import.meta.env.DEV);
}
