const { logger } = require('../logger/index');
const _ = require('lodash');
const moment = require('moment');

const miscHelpers = require('./misc');
const leadHelpers = require('./lead');
const advertiserHelpers = require('./advertisers');
const userHelpers = require('./users');

const Offer = require('../models/Offers');
const Lead = require('../models/Leads');

const leadReadyForSendStatus = 'ВАЛИДНЫЙ';
const leadNotSendedStatus = 'НЕ ОТПРАВЛЕННЫЙ';
const leadSendStatus = 'ОТПРАВЛЕННЫЙ';
const leadHoldStatus = 'ХОЛД';

async function getAdvertiserToSend(offerId, leadCountry, leadLanding, landingGroupName) {
    const current = moment().tz(process.env.TIMEZONE);

    const offerAdvertisers = await Offer.findOne({
        _id: offerId,
        // 'advertisers.id': '5f399245bf06b650493ce366'
    }, {
        _id: 1,
        advertisers: 1
    });

    const advertiserCheckData = [];

    for (const advertiser of offerAdvertisers.advertisers) {

        const advertiserDetails = {
            advertiserInternalId: advertiser.internalId,
            name: advertiser.name,
            id: advertiser.id,
            currentLeadsSend: advertiser.caps.current,
            sendStart: moment().toISOString(),
            isActive: false,
            isCapValid: false,
            isCountryValid: false,
            isCallCenteValid: false,
            isSendReady: false,
            isGroupValid: false,
            isDomainValid: false,
            isRedirectAvailable: advertiser.isRedirectAvailable,
            isCapsAvailable: advertiser.isCapsAvailable,
            sendRank: 0,
            project: advertiser.project
        };

        const callCenterWork = advertiser.callCenterWork;
        const parsedCCWork = miscHelpers.getStartEndTime(callCenterWork);

        const ccStartWork = parsedCCWork.startTime;
        const ccEndWork = parsedCCWork.endTime;
       
        // Check enabled/disabled on cap
        if (advertiser.isPaused || !advertiser.isCapsAvailable) {
            advertiserDetails.isActive = true;
        }
        // Check cap
        if (advertiser.caps.current < advertiser.caps.set || !advertiser.isCapsAvailable) {
            advertiserDetails.isCapValid = true;
        } 
        // Check country
        if(advertiser.countries.includes(leadCountry.toUpperCase())) {
            advertiserDetails.isCountryValid = true;
        } 
        // Check landing group
        let isGroupMatched = false;
        if(landingGroupName) {
            for(const group of advertiser.landingGroups) {
                if(group.name === landingGroupName.toLowerCase() && group.current < group.set && group.isActive) {
                    isGroupMatched = true;
                    break;
                }
            }
        }
       
        if(advertiser.landingGroups.length === 0 || isGroupMatched) {
            advertiserDetails.isGroupValid = true;
        }
        // Check domain
        if(advertiser.domains.length === 0 || advertiser.domains.includes(leadLanding.toLowerCase())) {
            advertiserDetails.isDomainValid = true;
        }
        // Check call center
        if(current.isBetween(ccStartWork, ccEndWork)) {
            advertiserDetails.isCallCenteValid = true;
        } 
        // Final check
        if(advertiserDetails.isCapValid 
            && advertiserDetails.isCountryValid 
            && advertiserDetails.isCallCenteValid 
            && advertiserDetails.isActive
            && advertiserDetails.isGroupValid
            && advertiserDetails.isDomainValid) {
            advertiserDetails.isSendReady = true;
        }

        advertiserCheckData.push(advertiserDetails);
    }

    const validAdverisers = [];

    advertiserCheckData.map(advertiser => {
        if (advertiser.isSendReady) validAdverisers.push({
            internalId: advertiser.advertiserInternalId,
            name: advertiser.name,
            id: advertiser.id,
            sendRank: advertiser.sendRank,
            currentLeadsSend: advertiser.currentLeadsSend,
            isRedirectAvailable: advertiser.isRedirectAvailable,
            isCapsAvailable: advertiser.isCapsAvailable,
            project: advertiser.project
        });
    });

    // Sort all partners first by send rank, second by total leads send
    const sortedAdvertisers = _.orderBy(validAdverisers, ['sendRank', 'currentLeadsSend'], ['desc', 'asc']);

    return {
        offerId: offerId,
        advertiserCheckData,
        advertisers: sortedAdvertisers
    };
};

async function updateAdvertiserCapSend (offerId, advertiserId, landingGroupName) {
    try {
        await Offer.updateOne(
            {
                _id: offerId,
                // advertisers: { $elemMatch: { id: advertiserId } }
            }, {
                $inc: {
                    "advertisers.$[advertiser].caps.current": 1,
                    "advertisers.$[advertiser].landingGroups.$[group].current": 1,
                }

            }, {
                arrayFilters: [
                    { "advertiser.id": advertiserId },
                    { "group.name": landingGroupName },
                ]
            });
    } catch (error) {
        logger.error('', error);
    }
};
// test heap
exports.sendLeadByCap = async (jobId) => {
    try {
        await Lead.updateMany(
            {
                status: leadReadyForSendStatus,
                offerCategoryId: { $in: [ 'finance', 'goods' ] },
                isSending: false,
                capJobId: null
            }, {
                capJobId: jobId,
                isSending: true
            }
        );

        const leadsReadyForSend = await Lead.find({
            status: leadReadyForSendStatus,
            offerCategoryId: { $in: [ 'finance', 'goods' ] },
            isSending: true,
            capJobId: jobId
        });
        
        const leadLog = {
            totalLeads: leadsReadyForSend.length,
            hold: 0,
            notSended: 0
        };

        for (const lead of leadsReadyForSend) {
            const leadLandingGroupName = lead.landingGroupName;
            const leadId = lead._id;
            const userId = lead.creator;

            const offerFilteredAdvertisers = await getAdvertiserToSend(lead.offerId, lead.country, lead.landing, leadLandingGroupName);
            const advertisers = offerFilteredAdvertisers.advertisers;
            const advertiserCheckData = offerFilteredAdvertisers.advertiserCheckData;
            const offerId = offerFilteredAdvertisers.offerId;
            // const leadLandingGroupName = lead.landingGroupName;

            if(advertisers.length === 0 ) {
                await leadHelpers.moveLeadToHold(leadId, advertiserCheckData);
                await leadHelpers.logLeadDetails(leadId, userId, 13, {});
                await leadHelpers.updateLeadSending(leadId, false);
                await leadHelpers.resetLeadCapJobId(leadId);
                leadLog.hold += 1;
            }
            else {
                for (const [index, advertiser] of advertisers.entries()) {
                    // wait for period between 20 to 80 seconds
                    const time = miscHelpers.getRandomNumberBetween(5000, 25000);
                    await miscHelpers.promiseSleep(time);

                    const advertiserId = advertiser.id;
                    const advertiserInternalId = advertiser.internalId;
                    const advertiserName = advertiser.name;
                    const advertiserProject = advertiser.project;

                    const advetiserMethods = advertiserHelpers.getAdvertiserApiTemplate(advertiserInternalId);
                    const sendLeadResult = await advetiserMethods.sendLead(lead, advertiserId);
    
                    const sendStatus = sendLeadResult.sendStatus ? sendLeadResult.sendStatus : false;
                    const responseStatus = sendLeadResult.status ? sendLeadResult.status : null;
                    const responseBody = sendLeadResult.data ? JSON.stringify(sendLeadResult.data) : null;
                    const formattedError = sendLeadResult.formattedError ? sendLeadResult.formattedError : null;
            
                    if (sendStatus) {
                        await updateAdvertiserCapSend(offerId, advertiserId, leadLandingGroupName);
                        await leadHelpers.updateLeadSendDetails(leadSendStatus, leadId, advertiserId, advertiserCheckData, responseStatus, responseBody, formattedError, advertiserProject);
                        await leadHelpers.updateLeadSending(leadId, false);
                        await leadHelpers.logLeadDetails(leadId, userId, 9, { advertiserInternalId: advertiserName, jobId });
                        await userHelpers.affiliateSuccessPostback(userId, lead);

                        leadLog[advertiser.internalId] = (leadLog[advertiser.internalId] || 0) + 1;
                        break;
                    } else {
                        await leadHelpers.logLeadDetails(leadId, userId, 10, { advertiserInternalId: advertiserName, jobId });
                    }

                    if (index === (advertisers.length - 1)) {
                        await leadHelpers.updateLeadSendDetails(leadNotSendedStatus, leadId, advertiserId, advertiserCheckData, responseStatus, responseBody, formattedError, null);
                        await leadHelpers.updateLeadSending(leadId, false);
                        await leadHelpers.resetLeadCapJobId(leadId);
                        leadLog.notSended += 1;
                    };
                }
            }
        }
        return leadLog;
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.resetOfferCapsAndActiveAdvertisers = async() => {
    try {
        const offers = await Offer.find({
            'categories.id': 'finance'
        });

        for (const offer of offers) {
            for (const advertiser of offer.advertisers) {
                advertiser.landingGroups.map(group => {
                    // group.set = 0;
                    group.current = 0;
                });
                await Offer.updateOne(
                    {
                        _id: offer._id,
                        advertisers: { $elemMatch: { id: advertiser.id }}
                    },
                    {
                        $set: {
                            'advertisers.$.caps.current': 0,
                            'advertisers.$.isPaused': false,
                            'advertisers.$.landingGroups': advertiser.landingGroups
                        }
                    }
                );
            }
        };
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

async function getOffersCapsDetails () {
    const financeCategory = 'finance';
    const goodsCategory = 'goods';

    const todayStartDate = miscHelpers.returnStartDateWithUTC();
    const todayEndDate = miscHelpers.returnEndDateWithUTC()

    const parsed = [];
    try {
        // const finance = await Offer.aggregate([
        //     { $match: { 'categories.id': financeCategory,  } },
        //     { $unwind: '$advertisers' },
        //     { $match: { 'advertisers.internalId': { $nin: ['a_abc'] } } },
        //     { $group: { _id: '$name', 
        //         leadsCurrent: {$sum: '$advertisers.caps.current'},
        //         leadsCap: {$sum: '$advertisers.caps.set'},
        //     }},
        //     { $sort: { _id: -1 }}
        // ]);

        const finance = await Offer.aggregate([
            { $match: { 'categories.id': financeCategory,  } },
            { $unwind: '$advertisers' },
            { $match: { 
                'advertisers.internalId': { $nin: ['a-fin'] },
            }},
            { $group: { _id: '$name', 
                advertiserCapCurrent: { $sum: '$advertisers.caps.current' },
                advertiserCapSet: { $sum: '$advertisers.caps.set' },
                landingGroups: { $addToSet: '$advertisers.landingGroups' }
            }},
            // Convert nested array values to array
            { $project: {
                advertiserCapCurrent: 1,
                advertiserCapSet: 1,
                landingGroups: { $reduce: {
                    input: "$landingGroups",
                    initialValue: [],
                    in: { $setUnion : ["$$value", "$$this"] }
                }}
            }},
            { $unwind: '$landingGroups' },
            { $group: { _id: { offerName: '$_id', landingGroup: '$landingGroups.name'}, 
                advertiserCapCurrent: { $max: '$advertiserCapCurrent' },
                advertiserCapSet: { $max: '$advertiserCapSet' },
                groupCapCurrent: { $sum: '$landingGroups.current' },
                groupCapSet: { $sum: '$landingGroups.set' },
            }},
            { $group: { _id: '$_id.offerName' , 
                offerCapCurrent: { $max: '$advertiserCapCurrent' },
                offerCapSet: { $max: '$advertiserCapSet' },
                landingGroups: { 
                    $push: {
                        $cond: {
                            if: { $ne: ['$groupCapSet', 0] },
                            then: { groupName: { $toUpper: '$_id.landingGroup' }, groupCapCurrent: '$groupCapCurrent', groupCapSet: '$groupCapSet' },
                            else: '$$REMOVE'
                        }
                    } 
                }
            }},
        ]);

        const goods = await Lead.aggregate([
            { $match: { 'offerCategoryId': goodsCategory, status: 'ОТПРАВЛЕННЫЙ', 'createdAt': { $gte: todayStartDate, $lte: todayEndDate } } },
            { $group: { _id: '$offerId', leads: { $sum: 1 } } },
            { $lookup: { from: 'offers', localField: '_id', foreignField: '_id', as: 'joinDetails'} },
            { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },
            { $addFields: { name: '$joinDetails.name' } },
            { $project: { joinDetails: 0, _id: 0 } },
            { $sort: { _id: -1 }}
        ]);

        parsed.push('*Финансы:*');
        // finance.map(offer => {
        //     parsed.push(`${offer._id}: ${offer.leadsCurrent}/${offer.leadsCap}`);
        // });
        finance.map(offer => {
            parsed.push(`Оффер ${offer._id}: [ ${offer.offerCapCurrent}/${offer.offerCapSet} ]`);
            offer.landingGroups.map(group => {
                parsed.push(` - ${group.groupName}: [ ${group.groupCapCurrent}/${group.groupCapSet} ]`);
            })
        });
        if(goods.length > 0) {
            parsed.push('*Товарка:*');
            goods.map(offer => {
                parsed.push(`${offer.name}: ${offer.leads}`);
            });
        }
        
        return parsed;
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

// exports.testCronJob = async () => {

// }

async function moveLeadsFromHoldToValid () {
    const oldStatus = leadHoldStatus;
    const newStatus = leadReadyForSendStatus;

    const startDateTime = moment.tz(process.env.TIMEZONE).set({ hour: 06, minute: 00, second: 00, millisecond: 0 });
    const endDateTime = moment.tz(process.env.TIMEZONE).set({ hour: 23, minute: 59, second: 59, millisecond: 0 });

    try {
        const holdLeads = await Lead.find({
            createdAt: {
                $gte: startDateTime,
                $lte: endDateTime
            },
            status: oldStatus
        }, {
            createdAt: 1,
            status: 1,
            creator: 1
        }).limit(15).sort({ createdAt: -1 });
        
        const updateResults = [];
        for(const lead of holdLeads) {
            const updateResult = await leadHelpers.changeLeadStatus(lead._id, leadHoldStatus, leadReadyForSendStatus);

            if(updateResult) {
                await leadHelpers.logLeadDetails(lead._id, lead.creator, 111, { oldStatus, newStatus });
                updateResults.push({
                    status: true,
                    leadId: lead._id,
                    createdAt: lead.createdAt,
                });
            } else {
                updateResults.push({
                    status: false,
                    leadId: lead._id,
                    createdAt: lead.createdAt,
                });
            }
        }

        return updateResults;

    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.getAdvertiserToSend = getAdvertiserToSend;
exports.updateAdvertiserCapSend = updateAdvertiserCapSend;
exports.getOffersCapsDetails = getOffersCapsDetails;
exports.moveLeadsFromHoldToValid = moveLeadsFromHoldToValid;