const CronJob = require('cron').CronJob;
const { logger } = require('../logger/index');
const jobsHelpers = require('../helpers/jobs');

const partnersController = require('../controllers/partners');

const loadAndMergeTmpData = new CronJob('0 */30 * * * *', async function () {
    let jobId;
    const subtaskDesc = 'Merge partners data'
    try {
        jobId = await jobsHelpers.startJob('merge-tmp');
        const meregeResult = await partnersController.getTempData(null, null, null, jobId);
        await jobsHelpers.updateJob(jobId,
            { status: true, description: subtaskDesc, data: meregeResult });
        await jobsHelpers.finishJob(jobId);
    } catch(error) {
        await jobsHelpers.updateJob(jobId,
            { status: false, description: subtaskDesc, data: { errorMessage: error.message, errorStack: error.stack }});
        await jobsHelpers.setErrorJob(jobId, error.message, error.stack);
        logger.error(error);
    }
});

exports.loadAndMergeTmpData = loadAndMergeTmpData;
