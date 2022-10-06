const express = require('express');

const { handleExceptions } = require('../../middleware/errorHandler');
const checkAuth = require('../../middleware/checkAuth');
const checkIsAdmin = require('../../middleware/checkIsAdmin');

const controller = require('../../controllers/sites/domains');

const router = express.Router();

router.get('', [checkAuth, checkIsAdmin], handleExceptions(controller.getDomains));
router.get('/webspaces', [ checkAuth, checkIsAdmin ], handleExceptions(controller.getPleskWebspaces));

router.post('', [checkAuth, checkIsAdmin], handleExceptions(controller.addDomain));
router.put('/subdomains/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.addSubdomains));
router.put('/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.updateDomain));
router.delete('/:id/:subId', [checkAuth, checkIsAdmin], handleExceptions(controller.deleteSubDomain));
router.delete('/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.deleteDomain));

router.get('/tlds', [checkAuth, checkIsAdmin], handleExceptions(controller.getTlds));
router.post('/generate', [checkAuth, checkIsAdmin], handleExceptions(controller.generateDomains));

// router.post('/test', [], handleExceptions(controller.testDomain));

module.exports = router;