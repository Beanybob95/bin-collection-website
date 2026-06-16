const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const addressesController = require('../controllers/addresses');
const { csrfSynchronisedProtection } = require('../middleware/csrf');

const addressesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // limit each IP to 100 requests per window across this router
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

router.use(addressesLimiter);

router.get('/', addressesController.index);
router.get('/new', addressesController.newForm);
router.get('/:id', addressesController.show);
router.post('/', csrfSynchronisedProtection, addressesController.create);

router.get('/:id/users/new', addressesController.newUserForm);
router.post(
    '/:id/users',
    csrfSynchronisedProtection,
    addressesController.addUser
);
router.delete(
    '/:id/users/:userId',
    csrfSynchronisedProtection,
    addressesController.removeUser
);

module.exports = router;
