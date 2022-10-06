const { logger } = require('../logger/index');
const moment = require('moment');
const telegram  = require('../utils/telgramBot');

const miscHelpers = require('../helpers/misc');
const advertiserHelpers = require('../helpers/advertisers');

// const domainGroups = require('../settings/domain-groups');

const Flow = require('../models/Flows');
const Offer = require('../models/Offers');
const Lead = require('../models/Leads');
const Log = require('../models/Lead-Logs');
const User = require('../models/Users');
const SiteGroup = require('../models/Site-Groups');
const Advertisers = require('../models/Advertisers');

const leadReadyForSendStatus = 'ВАЛИДНЫЙ';
const leadNotSendedStatus = 'НЕ ОТПРАВЛЕННЫЙ';
const leadSendStatus = 'ОТПРАВЛЕННЫЙ';
const leadHoldStatus = 'ХОЛД';

const trashWords = [
    'лох',
    'хуй',
    'пошли',
    'пошел',
    'жопу',
    'жопа',
    'тварь',
    'твари',
    'лохотрон',
    'мошенник',
    'мошенники',
    'пизду',
    'пизда',
    'ебучие',
    'дура',
    'дурак',
    'заебали',
    'развод',
    'разводилово',
    'пидарас',
    'пидарасы',
    'сдохните',
    'сука',
    'суки',
    'блять',
    'блядь',
    'test',
    'тест'
];

const hachWords = [
    'азамат',
    'азат',
    'азиз',
    'аида',
    'айбек',
    'айгуль',
    'айдар',
    'айнур',
    'айрат',
    'айсылу',
    'алим',
    'амина',
    'аминат',
    'анар',
    'анзор',
    'арби',
    'армен',
    'аскар',
    'аслан',
    'ахмед',
    'бахтиёр',
    'белла',
    'буян',
    'вагиф',
    'вардан',
    'геворг',
    'гульназ',
    'гульнара',
    'гульшат',
    'гурген',
    'джанибек',
    'дилшод',
    'диля',
    'жамшид',
    'зайнап',
    'зарема',
    'заур',
    'зафар',
    'зелимхан',
    'зульфия',
    'ибрагим',
    'ильвира',
    'ильгам',
    'ильдар',
    'ильдус',
    'ильмир',
    'ильмира',
    'ильназ',
    'ильнар',
    'ильнур',
    'ильфат',
    'ильшат',
    'ильяс',
    'индира',
    'ирек',
    'ислам',
    'карен',
    'кулжигит',
    'кумарбек',
    'кундуз',
    'ляйсан',
    'магомед',
    'мадина',
    'макка',
    'марат',
    'масхуд',
    'музаффар',
    'мурад',
    'мурат',
    'муслим',
    'мхитар',
    'назгул',
    'наида',
    'наиль',
    'нариман',
    'нияз',
    'нурбек',
    'нуржан',
    'нурия',
    'нурлан',
    'радик',
    'раиля',
    'рамазан',
    'рамзан',
    'рамиль',
    'рамиля',
    'рамис',
    'расул',
    'рафаил',
    'рафис',
    'рахат',
    'рашид',
    'ришат',
    'руфина',
    'саида',
    'самат',
    'саматбек',
    'сурен',
    'сухроб',
    'тигран',
    'улугбек',
    'умар',
    'усман',
    'фархат',
    'фарход',
    'фатима',
    'хадижат',
    'хасан',
    'хусен',
    'эльдар',
    'лиев',
    'еков',
    'швили',
    'джид',
    'жа',
    'дж',
    'зил',
    'хат',
    'хан',
    'бек',
    'кы',
    'Ильн',
    'хаб',
    'хад',
    'хам',
    'хас',
    'хал',
    'мус',
    'гул',
    'сул',
    'рул',
    'дул'
]

// exports.updateAdminLead = async (req, res) => {
//     const leadId = req.params.id;
//     const lead = { ...req.body };

//     const leadValidation = await leadHelpers.isLeadValid(lead);

//     let updateStatus;
//     try {
//         updateStatus = await Lead.updateOne(
//             {
//                 _id: leadId
//             },
//             {
//                 firstName: lead.firstName,
//                 lastName: lead.lastName,
//                 email: lead.email,
//                 phone: lead.phone,
//                 country: lead.country,
//                 town: lead.town,
//                 language: lead.language,
//                 ip: lead.ip,
//                 landing: lead.landing,
//                 prelanding: lead.prelanding,
//                 flowId: lead.flowId,
//                 offerId: leadValidation.isDataFound ? leadValidation.data.offerId : null,
//                 isSendReady: leadValidation.isSendReady,
//                 isValid: leadValidation.isValid,
//                 validationErrors: leadValidation.invalidDetails,
//                 sendStatus: false,
//                 creator: lead.creator
//             }
//         );
//     } catch (error) {
//         logger.error('', error);
//         handler.errorMessage(res, error);
//     }

//     await handler.pResponse(res, {
//         message: `Lead updated`
//     }, req);
// };

// async function updateLeadStatus(leadId, status) {
//     try {
//         await Lead.updateOne(
//             {
//                 _id: leadId
//             },
//             {
//                 status: status
//             }
//         )
//     } catch(error) {
//         throw error;
//     }
// }

exports.isLeadTrash = async (lead, trashRules) => {
    let trashStatus = null;
    const trashMessages = [];

    const currentDateMinusMonth = moment().tz(process.env.TIMEZONE).subtract(1, 'months');;

    // Add empty values if field not exist
    const email = !lead.email ? '' : lead.email.toLowerCase().trim();
    const phone = !lead.phone ? '' : lead.phone;
    const firstName = !lead.firstName ? '' : lead.firstName;
    const lastName = !lead.lastName ? '' : lead.lastName;
    const country = !lead.country ? '' : lead.country;

    try {
        let isEmailDublicated;
        let isPhoneDublicated;
        if(trashRules.email.duplicated && lead.email) isEmailDublicated = await Lead.findOne({ email: email, createdAt: { $gte: currentDateMinusMonth } });
        if(trashRules.phone.duplicated && lead.phone) isPhoneDublicated = await Lead.findOne({ phone: phone, createdAt: { $gte: currentDateMinusMonth } });

        if (trashRules.email.duplicated && isEmailDublicated) {
            trashStatus = 'ДУБЛИКАТ';
            trashMessages.push('Дубликат имейла');
        } else if (trashRules.phone.duplicated && isPhoneDublicated) {
            trashStatus = 'ДУБЛИКАТ';
            trashMessages.push('Дубликат телефона');
        } else if (trashRules.country.ua && country.toLowerCase() === 'ua') {
            trashStatus = 'ТРЕШ';
            trashMessages.push('Не валидная страна - ' + country);
        } else {
            // Check basic trash words
            for (var i = 0; i < trashWords.length; i++) {
                if (trashRules.email.test && email.toLowerCase().includes(trashWords[i])) { 
                    trashStatus = 'ТРЕШ';
                    trashMessages.push('Треш имейла, слово - ' + trashWords[i]);
                    break;
                }
                if (trashRules.firstName.test && firstName.toLowerCase().includes(trashWords[i])) { 
                    trashStatus = 'ТРЕШ';
                    trashMessages.push('Треш имени, слово - ' + trashWords[i]);
                    break;
                }
                if (trashRules.lastName.test && lastName.toLowerCase().includes(trashWords[i])) { 
                    trashStatus = 'ТРЕШ';
                    trashMessages.push('Треш фамилии, слово - ' + trashWords[i]);
                    break;
                }
               
            }
            
            // Check hach trash words
            for (var i = 0; i < hachWords.length; i++) {
                if(trashRules.firstName.test && firstName.toLowerCase().includes(hachWords[i])) {
                    trashStatus = 'ХАЧ';
                    trashMessages.push('Хач, слово в имени - ' + hachWords[i]);
                    break;
                }

                if(trashRules.lastName.test && lastName.toLowerCase().includes(hachWords[i])) {
                    trashStatus = 'ХАЧ';
                    trashMessages.push('Хач, слово в фамилии - ' + hachWords[i]);
                    break;
                }
            }
        };
    } catch(error) {
        throw error;
    }

    const isTrash = trashMessages.length === 0 ? false : true;

    return {
        isTrash: isTrash,
        trashStatus: trashStatus,
        trashMessages: trashMessages
    };
};

exports.isLeadValid = async (lead, validationRules) => {
    let validationStatus = null;
    const validationMessages = [];

    const data = {};

    // Check is there any rules for flowId
    if (validationRules.flowId.check) {
        if (validationRules.flowId.isempty && !lead.flowId) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push('Нет потока');
            
            data.flowId = null;
        } else if (validationRules.flowId.valid && !miscHelpers.isIdValidForMongo(lead.flowId)) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push(`Не валидный поток - ${lead.flowId}`);

            data.flowId = null;
        } else if (validationRules.flowId.exist) {
            try {
                const flowData = await Flow.findOne({ _id: lead.flowId, creator: lead.creator });
                
                if(!flowData) {
                    validationStatus = 'ОШИБКА ПОТОКА';
                    validationMessages.push(`Нет потока у аффилейта - ${lead.flowId}`);
                    data.flowId = null;
                } else {
                    data.flowId = flowData._id;
                    data.offerId = flowData.offer.id;
                    data.offerCategoryId = flowData.offer.category.id;
                }
            } catch(error) {
                throw error;
            }
        }
    }

    // Check is there any rules for flowId
    if (validationRules.flowIdWithoutCreator.check) {
        if (validationRules.flowIdWithoutCreator.isempty && !lead.flowId) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push('Нет потока');
            
            data.flowId = null;
        } else if (validationRules.flowIdWithoutCreator.valid && !miscHelpers.isIdValidForMongo(lead.flowId)) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push(`Не валидный поток - ${lead.flowId}`);

            data.flowId = null;
        } else if (validationRules.flowIdWithoutCreator.exist) {
            try {
                const flowData = await Flow.findOne({ _id: lead.flowId });
                
                if(!flowData) {
                    validationStatus = 'ОШИБКА ПОТОКА';
                    validationMessages.push(`Нет потока у аффилейта - ${lead.flowId}`);
                    data.flowId = null;
                } else {
                    data.flowId = flowData._id;
                    data.offerId = flowData.offer.id;
                    data.offerCategoryId = flowData.offer.category.id;
                    data.creator = flowData.creator;
                }
            } catch(error) {
                throw error;
            }
        }
    }

    // Check is there any rules for offerId
    if (validationRules.offerId.check) {
        if (validationRules.offerId.isempty && !lead.offerId) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push('Нет офера');
            
            data.offerId = null;
        } else if (validationRules.offerId.valid && !miscHelpers.isIdValidForMongo(lead.offerId)) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push('Не валидный офер');
    
            data.offerId = null;
        } else if (validationRules.offerId.exist) {
            try {
                const offerData = await Offer.findOne({ _id: lead.offerId });;
                
                if(!offerData) {
                    validationStatus = 'ОШИБКА ПОТОКА';
                    validationMessages.push('Офер не найден');

                    data.offerId = null;
                } else {
                    data.offerId = offerData._id;
                    data.offerExternalId = offerData.externalId;
                    data.offerCategoryId = offerData.categories.id;
                    data.redirectUrl = offerData.url;
                }
            } catch(error) {
                throw error;
            }
        }
    }

    // Check is there any rules for creator
    if (validationRules.creator.check) {
        if (validationRules.creator.isempty && !lead.creator) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push('Нет аффилейта');

            data.creator = null;
        } else if (validationRules.creator.valid && !miscHelpers.isIdValidForMongo(lead.creator)) {
            validationStatus = 'ОШИБКА ПОТОКА';
            validationMessages.push('Не валидный аффилейт');

            data.creator = null;
        } else if (validationRules.creator.exist) {
            try {
                const creatorData = await User.findOne({ _id: lead.creator });;
                
                if(!creatorData) {
                    validationStatus = 'ОШИБКА ПОТОКА';
                    validationMessages.push('Аффилейт не найден');

                    data.creator = null;
                } else {
                    data.creator = creatorData._id;
                    data.affiliateDashboardName = creatorData.dashboardName;
                }
            } catch(error) {
                throw error;
            }
        }
    }
    
    if(validationMessages.length > 0) {
        const isValid = validationMessages.length === 0 ? true : false;

        return {
            isValid: isValid,
            validationStatus: validationStatus,
            validationMessages: validationMessages,
            data: data
        };
    }

    // Check is there any rules for firstName
    if(validationRules.firstName.check) {
        if (validationRules.firstName.isempty && !lead.firstName) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустое имя');
        }
    }

    // Check is there any rules for lastName
    if (validationRules.lastName.check) {
        if (validationRules.lastName.isempty && !lead.lastName) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустая фамилия');
        }
    }

    // Check is there any rules for email
    if (validationRules.email.check) {
        if (validationRules.email.isempty && !lead.email) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустой имейл');
        }
    }

    // Check is there any rules for phone
    if (validationRules.phone.check) {
        if (validationRules.phone.isempty && !lead.phone) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустое телефон');
        } else {
            const trimmedPhone = lead.phone.trim()
            data.phone = trimmedPhone.charAt(0) == '+' ? trimmedPhone.trim() : '+' + trimmedPhone.trim()
        }
    }

    // Check is there any rules for country
    if (validationRules.country.check) {
        if (validationRules.country.isempty && !lead.country) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустая страна');
        } else if (validationRules.country.inlist && !miscHelpers.isCountryValid(lead.country)) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Не валидная страна');
        }
    }

    // Check is there any rules for language
    if (validationRules.language.check) {
        if (validationRules.language.isempty && !lead.language) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустой язык');
        } else if (validationRules.language.inlist && !miscHelpers.isLanguageValid(lead.language)) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Не валидный язык');
        }
    }

    // Check is there any rules for landing
    if (validationRules.landing.check) {
        if (validationRules.landing.isempty && !lead.landing) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустой лендинг');
        } else if (validationRules.landing.group && lead.landing) {
            data.landingGroup = getLeadLandingGroup(lead.landing);
        } else {
            const trimmedLanding = lead.landing.trim();
            data.landing = trimmedLanding.replace('https://', '').replace('http://', '');
        }
    }

    if(lead.prelanding) {
        const trimmedPrelanding = lead.prelanding.trim();
        data.prelanding = trimmedPrelanding.replace('https://', '').replace('http://', '');
    }

    // if (validationRules.landing.check) {
    //     if (validationRules.landing.isempty && !lead.landing) {
    //         validationStatus = 'НЕ ВАЛИДНЫЙ';
    //         validationMessages.push('Пустой лендинг');
    //     } else if (validationRules.landing.group && lead.landing) {
    //         data.landingGroup = getLeadLandingGroup(lead.landing);
    //     } else {
    //         const trimmedLanding = lead.landing.trim();
    //         data.landing = trimmedLanding.replace('https://', '').replace('http://', '');
    //     }
    // }

    // Check is there any rules for landigGroup
    if (validationRules.landingGroup.check) {
        if (validationRules.landingGroup.isempty && !lead.landingGroup) {
            validationStatus = 'НЕ ВАЛИДНЫЙ';
            validationMessages.push('Пустая группа лендингов');
        } else if (validationRules.landingGroup.exist) {
            try {
                const groupData = await SiteGroup.findOne({ subgroupName: (lead.landingGroup).toLowerCase(), type: 'landings' });;
                if(!groupData) {
                    validationStatus = 'НЕ ВАЛИДНЫЙ';
                    validationMessages.push(`Группа лендингов не найдена - ${lead.landingGroup}`);
                } else {
                    data.landingGroupName = groupData.groupName;
                    data.landingSubgroupName = groupData.subgroupName;
                }
            } catch(error) {
                throw error;
            }
        }
    }

    const isValid = validationMessages.length === 0 ? true : false;

    return {
        isValid: isValid,
        validationStatus: validationStatus,
        validationMessages: validationMessages,
        // isSendReady: isReadyForPartnerSend,
        // isDataFound: isDataFound,
        data: data
    };
};

exports.leadStatusGroup = (statuses) => {
    const statusesGroup = {
        all: {
            name: 'ВСЕ',
            count: 0
        }, trash: {
            name: 'ТРЕШ',
            count: 0
        }, notValid: {
            name: 'НЕ ВАЛИДНЫЙ',
            count: 0
        }, valid: {
            name: 'ВАЛИДНЫЙ',
            count: 0
        }, notSended: {
            name: 'НЕ ОТПРАВЛЕННЫЙ',
            count: 0
        }, sended: {
            name: 'ОТПРАВЛЕННЫЙ',
            count: 0
        }, hold: {
            name: 'ХОЛД',
            count: 0
        }
    
    };

    statuses.forEach(status => {
        statusesGroup.all.count += status.count;
        if (status._id === 'ДУБЛИКАТ' || status._id === 'ТРЕШ' || status._id === 'ХАЧ') {
            statusesGroup.trash.count += status.count;
        } else if (status._id === 'ОШИБКА ПОТОКА' || status._id === 'НЕ ВАЛИДНЫЙ') {
            statusesGroup.notValid.count += status.count;
        } else if (status._id === 'ВАЛИДНЫЙ') {
            statusesGroup.valid.count += status.count;
        } else if (status._id === 'НЕ ОТПРАВЛЕННЫЙ') {
            statusesGroup.notSended.count += status.count;
        } else if (status._id === 'ОТПРАВЛЕННЫЙ') {
            statusesGroup.sended.count += status.count;
        } else if (status._id === 'ХОЛД') {
            statusesGroup.hold.count += status.count;
        }
    });

    return statusesGroup;
};

exports.updateLeadSendDetails = async (status, leadId, advertiserId, checkData, responseStatus, response, formattedPartnerError, project) => {
    try {
        const leadUpdate = await Lead.updateOne(
            { _id: leadId }, { 
                status: status,
                advertiser: advertiserId,
                responseStatus: responseStatus,
                response: response,
                formattedPartnerError: formattedPartnerError,
                onSendCheck: checkData,
                sendDate: new Date(),
                project: project
            });

        return leadUpdate;
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.moveLeadToHold = async (leadId, checkData) => {
    try {
        const leadUpdate = await Lead.updateOne(
            { 
                _id: leadId 
            }, 
            { 
                status: leadHoldStatus,
                onSendCheck: checkData
            });
        return leadUpdate;
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.changeLeadStatus = async (leadId, oldStatus, newStatus) => {
    try {
        const result = await Lead.updateOne(
            { 
                _id: leadId,
                status: oldStatus
            }, 
            { 
                status: newStatus,
            });
        
        if(result.nModified === 1) {
            return true
        } else {
            return false
        }

    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

function leadMessages(messageId, options) {
    const messages = {
        1: 'Лид добавлен',
        2: 'Лид перемещен в холд, тип отправки: моментальная',
        3: `Лид успешно отправлен на партнера ${options.advertiserInternalId}, тип отправки: моментальная`,
        4: `Лид не отправлен на партнера ${options.advertiserInternalId}, тип отправки: моментальная`,
        5: `Лид добавлен в треш - ${options.validationErrors}`,
        6: `Лид добавлен в не валидные - ${options.validationErrors}`,
        7: `Лид успешно отправлен на партнера ${options.advertiserInternalId}, тип отправки: ручная`,
        8: `Лид не отправлен на партнера ${options.advertiserInternalId}, тип отправки: ручная`,
        9: `Лид успешно отправлен на партнера ${options.advertiserInternalId}, тип отправки: авто, jobid: ${options.jobId}`,
        10: `Лид не отправлен на партнера ${options.advertiserInternalId}, тип отправки: авто, jobid: ${options.jobId}`,
        11: `Статус лида обновлен, старый ${options.oldStatus} - новый ${options.newStatus}, тип замены: ручная`,
        111: `Статус лида обновлен, старый ${options.oldStatus} - новый ${options.newStatus}, тип замены:  авто`,
        12: `Лид обновлен, статус - ${options.newStatus}`,
        13: 'Лид перемещен в холд, тип отправки: авто',
        14: `Статус лида обновлен, старый ${options.oldStatus} - новый ${options.newStatus}, тип замены: массовая`,
        15: `Лид перенаправлен на: ${options.redirectUrl}`,
        16: `Постбек, статус лида изменен на: ${options.newStatus}, партнер: ${options.advertiserInternalId}`,
        17: `Постбек трекера не отправлен, нет id клика лида`,
        18: `Постбек трекера отправлен, id клик лида - ${options.trackerId}, статус лида - ${options.trackerStatus}`,
        19: `Постбек трекера не отправлен, внутрення ошибка`,
        20: `Постбек для аффилейта не отправлен, отсутствует параметр - ${options.urlParam}`,
        21: `Постбек для аффилейта не отправлен, статус - ${options.status}, ответ - ${options.data}`,
        22: `Постбек успешно отправлен для аффилейта - ${options.affiliate}`,
        23: `Лид найден по внешнему id рекламодателя - ${options.externalLeadId}`,
        24: `Лид не найден по внешнему id рекламодателя - ${options.externalLeadId}`,
        25: `Лид успешно заменен на А треш`,
    };

    return messages[messageId];
}

exports.logLeadDetails = async(leadId, userId, messageId, messageOptions) => {
    const message = leadMessages(messageId, messageOptions);

    try {
        const log = new Log({
            leadId: leadId,
            message: message,
            creator: userId,
        });
        const insert = await log.save();

        const update = await Lead.updateOne(
            {
                _id:leadId
            }, {
                $push: { logs: {
                    timestamp: insert.createdAt,
                    creator: insert.creator,
                    message: insert.message,
                } },
            }
        );
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.updateLeadSending = async (leadId, isSending) => {
    try {
        await Lead.updateOne(
            {
                _id:leadId
            }, {
                isSending: isSending
            }
        );
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.resetLeadCapJobId = async (leadId) => {
    try {
        await Lead.updateOne(
            {
                _id:leadId
            }, {
                capJobId: null
            }
        );
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.getSendDataTypeValue = async (sendDataType, lead, advertiserId) => {
    let siteGroup;
    let result;

    try {
        siteGroup = await advertiserHelpers.getLandingPlug(lead.landingGroup);

    } catch(error) {
        logger.error('', error);
        return {
            status: false,
            message: 'getSendDataTypeValue ' + error.message
        }
    }

    switch (sendDataType) {
        case 'landing-group':
            result = siteGroup.groupName;
            break;
        case 'landing-subgroup':
            result = siteGroup.subgroupName;
            break;
        case 'plug-only-tsl':
            result = siteGroup.plug;
            break;
        case 'plug-only-abc':
            result = siteGroup.aPlug;
            break;
        case 'plug-affiliate-tsl':
            result = `${siteGroup.plug}?aid=${lead.creator}`;
            break;
        case 'plug-affiliate-abc':
            result = `${siteGroup.aPlug}?aid=${lead.creator}`;
            break;
        case 'real-url':
            result = lead.landing;
            break;
        case 'default': 
            const advertiser = await Advertisers.findOne({
                _id: advertiserId
            });
            result = advertiser.defaultSendData;
            break;
        default:
            await telegram.sendMessage('Send data type value not found', 'dev');
    }

    return {
        status: true,
        message: 'OK',
        result
    }
}
