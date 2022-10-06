const CronJob = require('cron').CronJob;
const { logger } = require('../logger/index');
const domainHelpers = require('../helpers/sites/domains');

const sendDomainNotification = new CronJob({
    cronTime: '*/10 01-23 * * 1-5',
    timeZone: 'Europe/Kiev',
    onTick: async function () {
        try {
            await domainHelpers.checkNotActiveARecordsDomains();

        } catch (error) {
            logger.error('', error);
        }
    }
});

exports.sendDomainNotification = sendDomainNotification;