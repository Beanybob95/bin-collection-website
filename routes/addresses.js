const express = require('express');
const router = express.Router();
const addressesController = require('../controllers/addresses');

router.get('/', addressesController.index);
router.get('/new', addressesController.newForm);
router.get('/:id', addressesController.show);
router.post('/', addressesController.create);

router.get('/:id/users/new', addressesController.newUserForm);
router.post('/:id/users', addressesController.addUser);
router.delete('/:id/users/:userId', addressesController.removeUser);

module.exports = router;
