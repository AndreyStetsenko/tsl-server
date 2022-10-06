const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const leadsController = require('../controllers/leads');

const router = express.Router();

// Admin
router.get('/admin/valid-to-trash', [checkAuth, checkIsAdmin], handleExceptions(leadsController.moveLeadsFromValidToTrash));
router.get('/admin/hold-by-offer', [checkAuth, checkIsAdmin], handleExceptions(leadsController.getHoldLeadsByOffer));
// router.get('/admin/add-redirect-gambling', [], handleExceptions(leadsController.addAndRedirectGambling));
router.get('/admin/:id', [checkAuth, checkIsAdmin], handleExceptions(leadsController.getLead));
router.post('/admin/get-leads', [checkAuth, checkIsAdmin], handleExceptions(leadsController.getAdminLeads));
router.post('/admin/report-leads', [checkAuth, checkIsAdmin], handleExceptions(leadsController.generateAdminLeadsReport));
router.put('/admin/:id', [checkAuth, checkIsAdmin], handleExceptions(leadsController.updateAdminLead));
router.put('/admin/update-status/:id', [checkAuth, checkIsAdmin], handleExceptions(leadsController.updateLeadStatus));
router.post('/admin/send-lead', [checkAuth, checkIsAdmin], handleExceptions(leadsController.sendLeadToPartner));
router.post('/admin/send-a-trash', [checkAuth, checkIsAdmin], handleExceptions(leadsController.sendLeadToATrash));
router.post('/admin/shift-by-emails', [checkAuth, checkIsAdmin], handleExceptions(leadsController.shiftPartnerLeads));

// Affiliate
router.post('/affiliate/new-lead-flow', [checkAuth], handleExceptions(leadsController.addLeadByFlowId));
router.post('/affiliate/get-leads', [checkAuth], handleExceptions(leadsController.getAffiliateLeads));
router.get('/affiliate/:id', [checkAuth], handleExceptions(leadsController.getAffiliateLead));
router.put('/affiliate/:id', [checkAuth], handleExceptions(leadsController.updateAffiliateLead));

// Test
router.post('/test-partner-lead/:advertiser_id', [checkAuth, checkIsAdmin], handleExceptions(leadsController.testLeadSend));
router.post('/lead/advertiser-selection', [checkAuth, checkIsAdmin], handleExceptions(leadsController.testSelectionOfAdvertisers));

module.exports = router;