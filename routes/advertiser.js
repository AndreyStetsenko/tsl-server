const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const advertisersController = require('../controllers/advertisers');

const router = express.Router();

router.get('', [checkAuth, checkIsAdmin], handleExceptions(advertisersController.getAdvertisers));
router.get('/integrated', [checkAuth, checkIsAdmin], handleExceptions(advertisersController.getIntegratedAdvertisers));
router.get('/:id', [checkAuth, checkIsAdmin], handleExceptions(advertisersController.getAdvertiser));
router.post('', [checkAuth, checkIsAdmin], handleExceptions(advertisersController.addAdvertiser));
router.put('/:id', [checkAuth, checkIsAdmin], handleExceptions(advertisersController.updateAdvertiser));
router.delete('/:id', [checkAuth, checkIsAdmin], handleExceptions(advertisersController.deleteAdvertiser));

module.exports = router;