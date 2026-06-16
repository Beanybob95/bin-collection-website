const { csrfSync } = require('csrf-sync');

// Plain HTML forms can't set custom headers, so the CSRF token travels as a
// hidden `_csrf` form field instead of csrf-sync's default x-csrf-token header.
const { csrfSynchronisedProtection, generateToken } = csrfSync({
    getTokenFromRequest: (req) => req.body && req.body._csrf,
});

module.exports = { csrfSynchronisedProtection, generateToken };
