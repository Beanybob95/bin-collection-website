const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const binCollectionsController = require('../controllers/binCollections');

const binCollectionsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

router.get('/:id', binCollectionsLimiter, binCollectionsController.show);

module.exports = router;
