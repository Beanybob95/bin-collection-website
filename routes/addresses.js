const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const addressesController = require('../controllers/addresses');

const addUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 add-user requests per window
});

router.get('/', addressesController.index);
router.get('/new', addressesController.newForm);
router.get('/:id', addressesController.show);
router.post('/', addressesController.create);

router.get('/:id/users/new', addressesController.newUserForm);
router.post('/:id/users', addUserLimiter, addressesController.addUser);
router.delete('/:id/users/:userId', addressesController.removeUser);

module.exports = router;
