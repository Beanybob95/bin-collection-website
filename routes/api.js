const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const apiController = require('../controllers/api');

const addressListLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

router.post('/addresslist', addressListLimiter, apiController.addressList);

module.exports = router;
