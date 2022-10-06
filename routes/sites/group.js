const express = require('express');

const { handleExceptions } = require('../../middleware/errorHandler');
const checkAuth = require('../../middleware/checkAuth');
const checkIsAdmin = require('../../middleware/checkIsAdmin');

const controller = require('../../controllers/sites/groups');

const router = express.Router();

router.get('', [checkAuth, checkIsAdmin], handleExceptions(controller.getSubGroups));
router.get('/unique-groups', [checkAuth, checkIsAdmin], handleExceptions(controller.getUniqueLandingGroups));
router.get('/unique-subgroups', [checkAuth], handleExceptions(controller.getUniqueLandingSubroups));
router.post('', [checkAuth], handleExceptions(controller.addGroup));
router.put('/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.updateGroup));
router.delete('/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.deleteGroup));

// router.post('', [checkAuth, checkIsAdmin], handleExceptions(controller.addDomain));
// router.put('/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.updateDomain));
// router.delete('/:id', [checkAuth, checkIsAdmin], handleExceptions(controller.deleteDomain));

module.exports = router;