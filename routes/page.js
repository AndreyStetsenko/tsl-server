const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');

const pagesController = require('../controllers/pages');

const router = express.Router();

router.get('', checkAuth, handleExceptions(pagesController.renderIndex));

module.exports = router;