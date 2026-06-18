const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/auth');

// Stricter than the general DB-access limiters elsewhere: this also guards
// against credential-stuffing/brute-force attempts against /login.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // limit each IP to 20 auth attempts per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

router.get('/signup', authController.signupForm);
router.post('/signup', authLimiter, authController.signup);
router.get('/login', authController.loginForm);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);

module.exports = router;
