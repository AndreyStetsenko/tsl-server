const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const flowsController = require('../controllers/flows');

const router = express.Router();

router.get('', [checkAuth], handleExceptions(flowsController.getFlows));
router.get('/affiliate/flows', [checkAuth], handleExceptions(flowsController.getAffiliateFlows));
router.get('/affiliate/:id', [checkAuth, checkIsAdmin], handleExceptions(flowsController.getFlowsByAffiliate));
router.get('/:id', [checkAuth], handleExceptions(flowsController.getFlow));
router.get('/:id/disable', [checkAuth], handleExceptions(flowsController.disableFlow));
router.post('', [checkAuth], handleExceptions(flowsController.addFlow));
router.delete('/:id', [checkAuth], handleExceptions(flowsController.deleteFlow));

router.put('/flow-owner', [checkAuth], handleExceptions(flowsController.updateFlowOwner));

// router.put('/:id', [checkAuth, checkIsAdmin], handleExceptions(offersController.updateOffer));
// router.delete('/:id', [checkAuth, checkIsAdmin], handleExceptions(offersController.deleteOffer));

module.exports = router;