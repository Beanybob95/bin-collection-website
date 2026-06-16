const express = require('express');
const router = express.Router();
const addressesController = require('../controllers/addresses');
const { csrfSynchronisedProtection } = require('../middleware/csrf');

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
