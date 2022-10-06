const express = require('express');

const { handleExceptions } = require('../middleware/errorHandler');
const checkAuth = require('../middleware/checkAuth');
const checkIsAdmin = require('../middleware/checkIsAdmin');

const controller = require('../controllers/teams');

const router = express.Router();

router.get('', [checkAuth, checkIsAdmin], handleExceptions(controller.getTeams));
router.post('', [checkAuth, checkIsAdmin], handleExceptions(controller.createTeam));
router.put('', [checkAuth, checkIsAdmin], handleExceptions(controller.updateTeam));
router.post('/change-state', [checkAuth, checkIsAdmin], handleExceptions(controller.switchTeamState));
router.delete('/test', [checkAuth, checkIsAdmin], handleExceptions(controller.testTeams));

module.exports = router;
