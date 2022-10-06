const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const usersController = require('../controllers/users');

const router = express.Router();

router.post('/login', handleExceptions(usersController.loginUser));
// Admin
router.post('/admin', [checkAuth, checkIsAdmin], handleExceptions(usersController.createAdmin));
router.post('/reset-password', [checkAuth, checkIsAdmin], handleExceptions(usersController.resetUserPassword));
// Affiliate
router.get('/affs', [checkAuth, checkIsAdmin], handleExceptions(usersController.getAffiliates));
router.get('/affs/:id', [checkAuth, checkIsAdmin], handleExceptions(usersController.getAffiliate));
router.post('/affs', [checkAuth, checkIsAdmin], handleExceptions(usersController.createAffiliate));
router.put('/affs/:id', [checkAuth, checkIsAdmin], handleExceptions(usersController.updateAffiliate));
router.delete('/affs/:id', [checkAuth, checkIsAdmin], handleExceptions(usersController.deleteAffiliate));
router.put('/affs/:id/state', [checkAuth, checkIsAdmin], handleExceptions(usersController.changeAffiliateState));
router.put('/affs/:id/pass', [checkAuth, checkIsAdmin], handleExceptions(usersController.changeAffiliatePassword));

module.exports = router;
