const express = require('express');
const router = express.Router();
const addressesController = require('../controllers/addresses');

router.get('/', addressesController.index);
router.get('/new', addressesController.newForm);
router.get('/:id', addressesController.show);
router.post('/', addressesController.create);

router.get('/:id/contacts/new', addressesController.newContactForm);
router.post('/:id/contacts', addressesController.createContact);
router.delete('/contacts/:contactId', addressesController.destroyContact);

module.exports = router;