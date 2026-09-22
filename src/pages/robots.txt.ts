import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/lib/site';

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${absoluteUrl('/sitemap-index.xml')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
