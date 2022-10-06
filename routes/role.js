const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const controller = require('../controllers/roles');

const router = express.Router();

router.get('', [ checkAuth, checkIsAdmin ], handleExceptions(controller.getRoles));
router.post('', [ checkAuth, checkIsAdmin ], handleExceptions(controller.addRole));

module.exports = router;