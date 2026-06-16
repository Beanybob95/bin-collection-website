const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const { csrfSynchronisedProtection } = require('../middleware/csrf');

router.get('/signup', authController.signupForm);
router.post('/signup', csrfSynchronisedProtection, authController.signup);
router.get('/login', authController.loginForm);
router.post('/login', csrfSynchronisedProtection, authController.login);
router.post('/logout', csrfSynchronisedProtection, authController.logout);

module.exports = router;
