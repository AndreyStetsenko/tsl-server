const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const offersController = require('../controllers/offers');

const router = express.Router();

router.get('', [checkAuth], handleExceptions(offersController.getOffers));
router.get('/finance', [checkAuth], handleExceptions(offersController.getFinanceOffers));
router.get('/:id', [checkAuth], handleExceptions(offersController.getOffer));
router.post('', [checkAuth, checkIsAdmin], handleExceptions(offersController.addOffer));
router.put('/advertiser-stop-play', [checkAuth, checkIsAdmin], handleExceptions(offersController.playPauseAdvertiserCap));
router.put('/advertiser-group-stop-play', [checkAuth, checkIsAdmin], handleExceptions(offersController.playPauseGroupAdvertiserCap));
router.put('/offer-caps-by-offer', [checkAuth, checkIsAdmin], handleExceptions(offersController.updateOfferCapsByOffer));
router.put('/offer-caps', [checkAuth, checkIsAdmin], handleExceptions(offersController.updateOfferCaps));
router.put('/:id', [checkAuth, checkIsAdmin], handleExceptions(offersController.updateOffer));
router.delete('/:id', [checkAuth, checkIsAdmin], handleExceptions(offersController.deleteOffer));

module.exports = router;