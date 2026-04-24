// CORS proxy in front of the GitHub Releases PMTiles asset.
//
// Why this exists: GitHub's release-asset URLs 302 to
// release-assets.githubusercontent.com, which does not send
// Access-Control-Allow-Origin. Browser-based MapLibre refuses the
// cross-origin fetch. This Worker sits in front, re-issues the request
// server-side (no CORS involved), and adds the headers MapLibre needs.
//
// Caching: setting `cf.cacheEverything` lets Cloudflare's edge keep
// hot byte ranges in its own cache, so repeat fetches for popular
// tiles never round-trip to GitHub. Cache key includes the Range
// header by default, so each range slice is cached independently.

export interface Env {
    /** Full URL of the upstream PMTiles asset on GitHub Releases. */
    UPSTREAM_URL: string;
}

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
    'Access-Control-Max-Age': '86400',
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Browser preflight for the Range header.
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response('Method not allowed', {
                status: 405,
                headers: { ...CORS_HEADERS, Allow: 'GET, HEAD, OPTIONS' },
            });
        }

        // Forward only the Range header — everything else is noise and
        // some request headers (e.g. Host, CF-*) confuse upstream.
        const upstreamHeaders: Record<string, string> = {};
        const range = request.headers.get('range');
        if (range) upstreamHeaders['range'] = range;

        const upstream = await fetch(env.UPSTREAM_URL, {
            method: request.method,
            headers: upstreamHeaders,
            redirect: 'follow',
            // cache: 'no-store' is deliberate. Cloudflare's subrequest
            // cache is keyed by the upstream URL, so if a stale 4xx
            // ever sticks there (as happened during bring-up), even
            // `cacheTtlByStatus` can't evict it — TTL overrides only
            // apply to new cache writes, not to lookups of existing
            // entries. The outer response cache (Cache-Control below,
            // keyed by the client URL) still dedupes repeat hits.
            cache: 'no-store',
        });

        const responseHeaders = new Headers(upstream.headers);
        for (const [k, v] of Object.entries(CORS_HEADERS)) {
            responseHeaders.set(k, v);
        }
        // Only cache happy responses. If we send `public, max-age=…` on
        // a 404, Cloudflare's edge pins that 404 for the full window and
        // every client keeps seeing it until TTL expires — even after
        // the upstream recovers.
        if (upstream.ok) {
            responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
        } else {
            responseHeaders.set('Cache-Control', 'no-store');
        }

        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: responseHeaders,
        });
    },
} satisfies ExportedHandler<Env>;
