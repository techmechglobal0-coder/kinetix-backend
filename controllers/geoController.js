// Resolves which country a visitor is browsing from, so the storefront can
// price in PKR for Pakistan and USD everywhere else.
//
// This runs on the server rather than in the browser on purpose: a browser
// call to a geo API is blocked by CORS, and the providers front their
// endpoints with bot challenges that a page request cannot pass. Server to
// server there is no such restriction, and the request already carries the
// visitor's real IP.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 4000;
const cache = new Map();

// Hostinger (and any reverse proxy) puts the real client address in
// x-forwarded-for; the socket address would just be the proxy itself.
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const raw = forwarded
        ? String(forwarded).split(',')[0]
        : (req.socket && req.socket.remoteAddress) || '';
    // Node reports IPv4 clients as IPv4-mapped IPv6 (::ffff:1.2.3.4)
    return raw.trim().replace(/^::ffff:/i, '');
};

// Loopback and LAN addresses carry no country. That is the normal case in
// local development, and the caller falls back to the browser's timezone.
const isPrivateIp = (ip) => {
    if (!ip || ip === '::1') return true;
    if (/^(127|10)\./.test(ip)) return true;
    if (/^192\.168\./.test(ip)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
    if (/^(f[cd]|fe80)/i.test(ip)) return true; // unique-local / link-local IPv6
    return false;
};

const fetchJson = async (url) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        return null;
    } finally {
        clearTimeout(timer);
    }
};

// Two providers so a single outage or rate limit does not silently push every
// Pakistani visitor onto USD pricing.
const lookupCountry = async (ip) => {
    const primary = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (primary && primary.success && primary.country_code) {
        return String(primary.country_code).toUpperCase();
    }

    const fallback = await fetchJson(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`
    );
    if (fallback && fallback.status === 'success' && fallback.countryCode) {
        return String(fallback.countryCode).toUpperCase();
    }

    return null;
};

// GET /api/geo -> { country: 'PK' | 'US' | ... | null }
// country is null when it genuinely cannot be determined; the storefront then
// falls back to the visitor's timezone rather than guessing wrong.
const getVisitorCountry = async (req, res) => {
    try {
        const ip = getClientIp(req);

        if (isPrivateIp(ip)) {
            return res.json({ country: null, reason: 'private-address' });
        }

        const cached = cache.get(ip);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
            return res.json({ country: cached.country, cached: true });
        }

        const country = await lookupCountry(ip);
        if (country) cache.set(ip, { country, at: Date.now() });

        return res.json({ country });
    } catch (err) {
        // Never fail the page over this - the client falls back on its own
        return res.json({ country: null, reason: 'lookup-failed' });
    }
};

module.exports = { getVisitorCountry, getClientIp, isPrivateIp };
