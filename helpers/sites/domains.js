const { logger } = require('../../logger/index');
const dnsUtils = require('../../utils/dns');
const telegram = require('../../utils/telgramBot');

const Domain = require('../../models/Domains');

async function getDomainsWithNotActiveARecords () {
    try {
        const domains = await Domain.find({
            aRecordActive: false
        });

        return domains;
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.checkNotActiveARecordsDomains = async (advertiserId) => {
    try {
        const domains = await getDomainsWithNotActiveARecords();

        for(const domain of domains) {
            const currentRecords = await dnsUtils.getDomainDetails(domain.name);
            const isARecordActive = currentRecords.aRecords.includes(domain.ipAdress);
            if(isARecordActive) {
                await Domain.updateOne(
                    {
                        _id: domain.id
                    }, {
                        aRecordActive: true
                    }
                );
                
                const message = `Домен: ${domain.name} обновил свои А записи на - ${domain.ipAdress}.`;
                await telegram.sendMessage(message, 'dev');
            };
        
        }
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.updateDomain = async (name, updateField) => {
    try {
        await Domain.updateOne(
            { name: name.toLowerCase() }, updateField
        );
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.prepareTfsLog = (stepName, stepStatus, stepErrorMessage) => {
    return {
        platform: 'TFS',
        stepName,
        requestStatus: true,
        stepStatus,
        requestErrorMessage: null,
        stepErrorMessage,
        data: null
    }
};

exports.addLogRecord = async (id, log) => {
    const { platform,
        stepName,
        requestStatus,
        stepStatus,
        requestErrorMessage,
        stepErrorMessage,
        data
    } = { ...log };
    
    try {
        await Domain.updateOne(
            { 
                _id: id
            }, {
                $push: { logs: {
                    timestamp: new Date(),
                    platform,
                    stepName,
                    requestStatus,
                    stepStatus,
                    requestErrorMessage,
                    stepErrorMessage,
                    data,
                }},
            }
        );
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};
