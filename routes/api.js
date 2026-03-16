const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api');

router.post('/addresslist', apiController.addressList);

module.exports = router;