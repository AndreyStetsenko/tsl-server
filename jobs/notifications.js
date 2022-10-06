const CronJob = require('cron').CronJob;
const { logger } = require('../logger/index');
const telegram = require('../utils/telgramBot');

const capHelpers = require('../helpers/caps');

const sendCapNotification = new CronJob({
    cronTime: '*/20 10-20 * * 1-6',
    timeZone: 'Europe/Kiev',
    onTick: async function () {
        try {
            const offers = await capHelpers.getOffersCapsDetails();

            const offersMessage = offers.join('\r\n');
            await telegram.sendMessage(offersMessage, 'notify');

        } catch (error) {
            logger.error('', error);
        }
    }
});

exports.sendCapNotification = sendCapNotification;