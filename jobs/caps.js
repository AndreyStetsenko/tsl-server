const CronJob = require('cron').CronJob;
const { logger } = require('../logger/index');
const telegram = require('../utils/telgramBot');

const jobsHelpers = require('../helpers/jobs');
const capHelpers = require('../helpers/caps');

const sendLeadsWithCap = new CronJob('0 */10 * * * *', async function () {
    let jobId;
    const subtaskDesc = 'Send leads'
    try {
        jobId = await jobsHelpers.startJob('leads-send');
        const result = await capHelpers.sendLeadByCap(jobId);
        await jobsHelpers.updateJob(jobId,
            { status: true, description: subtaskDesc, data: result });
        await jobsHelpers.finishJob(jobId);
    } catch(error) {
        await jobsHelpers.updateJob(jobId,
            { status: false, description: subtaskDesc, data: { errorMessage: error.message, errorStack: error.stack }});
        await jobsHelpers.setErrorJob(jobId, error.message, error.stack);
        logger.error(error);
    }
});

const resetCaps = new CronJob({
    cronTime: '00 59 23 * * *',
    timeZone: process.env.TIMEZONE,
    onTick: async function () {
        await capHelpers.resetOfferCapsAndActiveAdvertisers();
    }
});

const moveLeadsFromHoldToValid = new CronJob({
    cronTime: '0 */10 06-23 * * *',
    timeZone: process.env.TIMEZONE,
    onTick: async function () {
        try {
            const jobId = await jobsHelpers.startJob('hold-to-valid');
            const result = await capHelpers.moveLeadsFromHoldToValid();
            await jobsHelpers.updateJob(jobId, {status: true, description: result });
            await jobsHelpers.finishJob(jobId);
        } catch(error) {
            await jobsHelpers.updateJob(jobId, {status: false, description: result, data: { errorMessage: error.message, errorStack: error.stack } });
            await jobsHelpers.setErrorJob(jobId, error.message, error.stack);
            logger.error(error);
        }
    }
});

exports.sendLeadsWithCap = sendLeadsWithCap;
exports.resetCaps = resetCaps;
exports.moveLeadsFromHoldToValid = moveLeadsFromHoldToValid;