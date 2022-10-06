const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const dashboardsController = require('../controllers/dashboards');

const router = express.Router();

// Admin
// router.post('/aff-total', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getTotalAffiliates));
// router.post('/adv-total', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getTotalAdvertisers));
// router.post('/send-leads-total', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getTotalSendLeads));
// router.post('/not-send-leads-total', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getTotalNotSendLeads));
// router.post('/not-valid-leads-total', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getTotalNotValidLeads));
router.get('/total-hold-leads', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getTotalHoldLeads));
router.post('/dashboard-data', [checkAuth, checkIsAdmin], handleExceptions(dashboardsController.getAdminCardsData));
router.post('/aggr-leads', checkAuth, handleExceptions(dashboardsController.getAggregatedLeads));
router.post('/leads-by-offer', checkAuth, handleExceptions(dashboardsController.aggrLeadsByOffers));
router.post('/leads-by-affiliate', checkAuth, handleExceptions(dashboardsController.aggrLeadsByAffiliates));
router.post('/leads-by-partner', checkAuth, handleExceptions(dashboardsController.aggrLeadsByPartners));
router.post('/leads-by-offer-affiliate', checkAuth, handleExceptions(dashboardsController.aggrSendedLeadsByOffers));
router.post('/leads-by-team-offer', checkAuth, handleExceptions(dashboardsController.aggrSendedLeadsByTeamOffer));
router.post('/leads-by-pstatus-affiliate', checkAuth, handleExceptions(dashboardsController.aggrLeadsByPartnerStatus));
router.post('/send-leads-by-offer-ts', checkAuth, handleExceptions(dashboardsController.aggrSendLeadsByOfferDateSerries));
router.post('/send-leads-by-aff-partner-landing', checkAuth, handleExceptions(dashboardsController.aggrSendLeadsByAffiliatePartnerLanding));

// Affiliate
router.post('/affiliate/dashboard-data', checkAuth, handleExceptions(dashboardsController.getAffiliateCardsData));
router.post('/affiliate/leads-by-status-flow', checkAuth, handleExceptions(dashboardsController.aggrLeadsByFlows));
router.post('/affiliate/leads-by-pstatus-offer', checkAuth, handleExceptions(dashboardsController.affAggrLeadsByPartnerStatus));
router.post('/affiliate/leads-by-affiliates', checkAuth, handleExceptions(dashboardsController.affAggrLeadsByAffiliates));

// Test
router.get('/test/lookup', checkAuth, handleExceptions(dashboardsController.newLookupTest));

module.exports = router;