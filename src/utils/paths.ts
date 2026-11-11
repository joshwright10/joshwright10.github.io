/**
 * Prefixes an internal root-relative path with Astro's configured BASE_URL
 * so links work both at `/` (production) and `/pr-preview/pr-XX/` (PR previews).
 */
export function withBase(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  return cleanPath === '/' ? `${base}/` : `${base}${cleanPath}`;
}
