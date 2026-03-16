const express = require('express');
const router = express.Router();
const binCollectionsController = require('../controllers/binCollections');

router.get('/:id', binCollectionsController.show);

module.exports = router;