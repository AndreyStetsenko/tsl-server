const SiteGroups = require('../models/Site-Groups');
const telegram  = require('../utils/telgramBot');

const ADVERTISER_API_TEMPLATE_PATH = '../settings/advertisers/api/';

exports.getAdvertiserApiTemplate = (internalId) => {
    const advertiserTrimmed = internalId.trim();
    try {
        const advertiserMethods = require(ADVERTISER_API_TEMPLATE_PATH + advertiserTrimmed);
        return advertiserMethods;
    } catch (error) {
        if(error.code === 'MODULE_NOT_FOUND') {
            telegram.sendMessage(`Template || Advertiser  - ${advertiserTrimmed}`, 'dev');
            throw new Error(`Advertiser ${advertiserTrimmed} not integrated`);
        } else {
            throw error;
        }
    }
};

exports.getLandingPlug = async (landingSubGroup) => {
    const result = {
        status: false,
        empty: false,
        notFound: false,
        plug: null,
        aPlug: null,
        message: null
    };

    if (!landingSubGroup){
        result.message = 'Пустая сабгруппа лендингов';
        result.empty = true;
        return result;
    }

    if (landingSubGroup.toLowerCase() == 'test'){
        result.message = 'Тестовая сабгруппа лендингов (test)';
        result.empty = true;
        await telegram.sendMessage(result.message, 'dev');
        return result;
    }

    try {
        const group = await SiteGroups.findOne({
            subgroupName: landingSubGroup.toLowerCase(),
            type: 'landings'
        });

        if (!group) {
            result.message = `Заглушка лендинга для сабгруппы '${landingSubGroup}' не найдена`;
            result.notFound = true;
            await telegram.sendMessage(result.message, 'dev');

            return result;
        } else {
            result.status = true;
            result.plug = group.plug;
            result.aPlug = group.aPlug;
            result.groupName = group.groupName;
            result.subgroupName = group.subgroupName;
            result.message = 'Заглушка лендинга найдена';
            return result;
        }
    } catch(error) {
        logger.error('', error);
    }
};

exports.getPrelandingPlug = async (prelandingSubGroup) => {
    const result = {
        status: false,
        empty: false,
        notFound: false,
        plug: null,
        message: null
    };

    if (!prelandingSubGroup){
        result.message = 'Пустая сабгруппа прелендингов';
        result.empty = true;
        return result;
    }

    if (prelandingSubGroup.toLowerCase() == 'test'){
        result.message = 'Тестовая сабгруппа прелендингов (test)';
        result.empty = true;
        await telegram.sendMessage(result.message, 'dev');
        return result;
    }

    try {
        const subGroup = await SiteGroups.findOne({
            subgroupName: prelandingSubGroup.toLowerCase(),
            type: 'prelandings'
        });

        if (!subGroup) {
            result.message = `Заглушка прелендинга для сабгруппы '${prelandingSubGroup}' не найдена`;
            result.notFound = true;
            await telegram.sendMessage(result.message, 'dev');

            return result;
        } else {
            result.status = true;
            result.plug = subGroup.plug;
            result.groupName = subGroup.groupName;
            result.message = 'Заглушка найдена';
            return result;
        }
    } catch(error) {
        logger.error('', error);
    }
};

exports.getApiParameter = (advertiserData, parametrName) => {
    const searchParameter = advertiserData.filter(param => param.name === parametrName);
    if(!searchParameter) {
        return false;
    }

    if(searchParameter.length === 0) {
        return false;
    }

    if(!searchParameter[0].value) {
        return false;
    }

    const parameter = searchParameter[0].value;
    return parameter;
};
