const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const controller = require('../controllers/configs');

const router = express.Router();

router.post('', [checkAuth, checkIsAdmin], handleExceptions(controller.add));

module.exports = router;