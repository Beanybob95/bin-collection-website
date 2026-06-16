const { csrfSync } = require('csrf-sync');

// Plain HTML forms can't set custom headers, so the CSRF token travels as a
// hidden `_csrf` form field instead of csrf-sync's default x-csrf-token header.
// /api is a stateless read-only proxy called via fetch() (no HTML form to carry
// a token) and /dev is a manual, dev-only curl trigger - neither mutates
// user-owned data, so both are exempt. GET/HEAD/OPTIONS are exempt by default.
const { csrfSynchronisedProtection, generateToken } = csrfSync({
    getTokenFromRequest: (req) => req.body && req.body._csrf,
    skipCsrfProtection: (req) =>
        req.path.startsWith('/api') || req.path.startsWith('/dev'),
});

module.exports = { csrfSynchronisedProtection, generateToken };
