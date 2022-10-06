const handler = require('../utils/responseHandler');
const mongoose = require('mongoose');
const { logger } = require('../logger/index');
const _ = require('lodash');

const capsHelpers = require('../helpers/caps');
const dbHelpers = require('../helpers/db-helpers');
const leadHelpers = require('../helpers/lead');
const miscHelpers = require('../helpers/misc');
const advertiserHelpers = require('../helpers/advertisers');
const capHelpers = require('../helpers/caps');
const offerHelpers = require('../helpers/offer');
const userHelpers = require('../helpers/users');

const Lead = require('../models/Leads');
const Offer = require('../models/Offers');
const User = require('../models/Users');
const Flow = require('../models/Flows');
const Partner = require('../models/Advertisers');
const Advertiser = require('../models/Advertisers');

const affiliateRole = 'affiliate';
const adminRole = 'admin';

const leadValidStatus = 'ВАЛИДНЫЙ'
const leadHoldStatus = 'ХОЛД';
const leadSendStatus = 'ОТПРАВЛЕННЫЙ';
const leadNotSendedStatus = 'НЕ ОТПРАВЛЕННЫЙ';
const leadTrashStatus = 'ТРЕШ';

exports.getAdminLeads = async (req, res) => {
    const pageSize = +req.body.pageSize;
    const currentPage = +req.body.page;
    const sortColumn = req.body.sortColumn;
    const sortOrder = req.body.sortOrder;
    const filter = req.body.filter;

    const sortingMap = {
        asc: 1,
        desc: -1
    };

    const updatedFilterObject = dbHelpers.prepareMongoFilter(filter);
    const sort = sortOrder ? { [sortColumn]: sortingMap[sortOrder] } : {};
    const leadsQuery = Lead.find(updatedFilterObject);
    if (pageSize && currentPage) {
        leadsQuery
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize)
            .sort(sort)
    }

    let leads;
    let total;
    let offers;
    let affiliates;
    let partners;
    let mergedStatuses;
    const  statuses = [
        "ВАЛИДНЫЙ",
        "ДУБЛИКАТ",
        "НЕ ОТПРАВЛЕННЫЙ",
        "ОТПРАВЛЕННЫЙ",
        "ОШИБКА ПОТОКА",
        "ТРЕШ",
        "ХАЧ"
    ];

    try {
        leads = await leadsQuery;
        total = await Lead.count(updatedFilterObject);

        delete updatedFilterObject.status;
        statusesCount = await Lead.aggregate([
            {
                $match: updatedFilterObject
            },
            {
                $group : { _id: "$status", count: {$sum:1} }
            }
        ]);
        mergedStatuses = leadHelpers.leadStatusGroup(statusesCount);

        offers = await Offer.find({}, { _id: 1, name: 1 });
        affiliates = await User.find({}, { _id: 1, dashboardName: 1, team: 1 });
        partners = await Partner.find({}, { _id: 1, name: 1});
        // groupStatuses = await Lead.distinct('status', { status: { $ne: null } });
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error.message);
    }

    return handler.pResponse(res, {
        message: 'Leads list',
        leads: leads,
        offers: offers,
        affiliates: affiliates,
        partners: partners,
        statuses: statuses,
        total: total,
        mergedStatuses: mergedStatuses
    }, req);
};

exports.generateAdminLeadsReport = async (req, res) => {
    const sortColumn = req.body.sortColumn;
    const sortOrder = req.body.sortOrder;
    const filter = req.body.filter;

    const sortingMap = {
        asc: 1,
        desc: -1
    };

    const updatedFilterObject = dbHelpers.prepareMongoFilter(filter);
    const reportColumns = 'firstName lastName email phone country language landing';

    const sort = sortOrder ? { [sortColumn]: sortingMap[sortOrder] } : {};
    const leadsQuery = Lead.find(updatedFilterObject).sort(sort).select(reportColumns);

    let leads;
    try {
        leads = await leadsQuery;
    } catch (error) {
        handler.errorMessage(res, error.message);
        logger.error('', error);
    }

    return handler.pResponse(res, {
        message: 'Leads report',
        leads: leads
    }, req);
};

async function sendLead(lead) {
    const userId = lead.creator;
    
    const offerFilteredAdvertisers = await capHelpers.getAdvertiserToSend(
        lead.offerId,
        lead.country,
        lead.landing,
        lead.landingGroupName,
    );
    const advertisers = offerFilteredAdvertisers.advertisers;
    const advertiserCheckData = offerFilteredAdvertisers.advertiserCheckData;
    const offerId = offerFilteredAdvertisers.offerId;
    const leadId = lead._id;
    const leadLandingGroupName = lead.landingGroupName;

    const returnResult = {
        leadStatus: null,
        isRedirectAvailable: false,
        partnerRedirectUrl: null,
    };

    try {
        if(advertisers.length === 0 ) {
            await leadHelpers.moveLeadToHold(leadId, advertiserCheckData);
            await leadHelpers.logLeadDetails(leadId, userId, 2, {});

            returnResult.leadStatus = leadHoldStatus;

            return returnResult;
        } 
        else {
            for (const [index, advertiser] of advertisers.entries()) {
                const advertiserId = advertiser.id;
                const advertiserName = advertiser.name;
                const advertiserInternalId = advertiser.internalId;
                const isRedirectAvailable = advertiser.isRedirectAvailable;
                const isCapsAvailable = advertiser.isCapsAvailable;
                const advertiserProject = advertiser.project;

                const advertiserMethods = advertiserHelpers.getAdvertiserApiTemplate(advertiserInternalId);
                const sendLeadResult = await advertiserMethods.sendLead(lead, advertiserId);
                
                const sendStatus = sendLeadResult.sendStatus ? sendLeadResult.sendStatus : false;
                const responseStatus = sendLeadResult.status ? sendLeadResult.status : null;
                const responseBody = sendLeadResult.data ? JSON.stringify(sendLeadResult.data) : null;
                const formattedError = sendLeadResult.formattedError ? sendLeadResult.formattedError : null;
                const partnerRedirectUrl = sendLeadResult.partnerRedirectUrl ? sendLeadResult.partnerRedirectUrl : null
    
                if (sendStatus) {
                    if(isCapsAvailable) await capHelpers.updateAdvertiserCapSend(offerId, advertiserId, leadLandingGroupName);
                    await leadHelpers.updateLeadSendDetails(leadSendStatus, leadId, advertiserId, advertiserCheckData, responseStatus, responseBody, formattedError, advertiserProject);
                    await leadHelpers.logLeadDetails(leadId, userId, 3, { advertiserInternalId: advertiserName });
                    await userHelpers.affiliateSuccessPostback(userId, lead);

                    returnResult.leadStatus = leadSendStatus;
                    returnResult.isRedirectAvailable = isRedirectAvailable;
                    returnResult.partnerRedirectUrl = partnerRedirectUrl;

                    return returnResult;
                } else {
                    await leadHelpers.logLeadDetails(leadId, userId, 4, { advertiserInternalId: advertiserName });
                }
    
                if (index === (advertisers.length - 1)) {
                    await leadHelpers.updateLeadSendDetails(leadNotSendedStatus, leadId, advertiserId, advertiserCheckData, responseStatus, responseBody, formattedError, null);
                    
                    returnResult.leadStatus = leadNotSendedStatus;
                    
                    return returnResult;
                };
            }
        }
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}

exports.addLeadByFlowId = async (req, res) => {
    const { userId } = { ...req.userData };
    const lead = { ...req.body };

    const TRASH_RULES_GROUP = 0;
    const VALIDATION_RULES_GROUP= 0;

    lead.creator = userId;
    lead.advertiser = null;

    try {
        const trashRules = offerHelpers.getOfferTrashRules(TRASH_RULES_GROUP);
        const validationRules = offerHelpers.getOfferValidationRules(VALIDATION_RULES_GROUP);

        const trashCheck = await leadHelpers.isLeadTrash(lead, trashRules);
        const validationCheck = await leadHelpers.isLeadValid(lead, validationRules);

        const dataToReach = validationCheck.data;

        if (trashCheck.isTrash) {
            dataToReach.status = trashCheck.trashStatus;
            dataToReach.validationErrors = trashCheck.trashMessages;
        } else if (!validationCheck.isValid) {
            dataToReach.status = validationCheck.validationStatus;
            dataToReach.validationErrors = validationCheck.validationMessages;
        } else {
            dataToReach.status = leadValidStatus;
            dataToReach.validationErrors = [];
        }

        const leadWithNewData = Object.assign({}, lead, dataToReach);

        const mongoLead = new Lead({ ...leadWithNewData });

        const savedLead = await mongoLead.save();
        const leadId = savedLead._id;
        leadWithNewData._id = leadId;

        await leadHelpers.logLeadDetails(leadId, userId, 1, {});
        if(trashCheck.isTrash) {
            await leadHelpers.logLeadDetails(leadId, userId, 5, { validationErrors: leadWithNewData.validationErrors });
        } else if(!validationCheck.isValid) {
            await leadHelpers.logLeadDetails(leadId, userId, 6, { validationErrors: leadWithNewData.validationErrors });
        }

        let sendLeadResult;

        if(validationCheck.isValid && !trashCheck.isTrash) {
            await leadHelpers.updateLeadSending(leadId, true);
            sendLeadResult = await sendLead(leadWithNewData);
            await leadHelpers.updateLeadSending(leadId, false);
        }

        await handler.pResponse(res, {
            message: 'Lead added by flow',
            leadId: leadId,
            leadStatus: sendLeadResult ? sendLeadResult.leadStatus : dataToReach.status,
            isRedirectAvailable: sendLeadResult ? sendLeadResult.isRedirectAvailable : false,
            partnerRedirectUrl: sendLeadResult ? sendLeadResult.partnerRedirectUrl : null
        }, req);
        
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error);
    }
};

exports.sendLeadToPartner = async (req, res) => {
    const { userId } = { ...req.userData };
    const { leadId, advertiserId } = { ...req.body };

    if (!leadId) return handler.errorMessage(res, 'Lead id cannot be empty!');
    if(!miscHelpers.isIdValidForMongo(leadId)) return handler.errorMessage(res, 'Lead id is not valid!');
    if (!advertiserId) return handler.errorMessage(res, 'Advertiser id cannot be empty!');

    try {
        const advertiser = await Advertiser.findOne({ _id: advertiserId });
        const lead = await Lead.findOne({ _id: leadId });
        const leadLandingGroupName = lead.landingGroupName;

        if(lead.isSending) {
            return handler.errorMessage(res, 'Невозможно, лид записан на автоотправку');
        }

        if(!lead || !advertiser) {
            return handler.errorMessage(res, 'Lead, or advertiser not found');
        } else {
            const advertiserToSend = advertiserHelpers.getAdvertiserApiTemplate(advertiser.internalId);
            const sendLeadResult = await advertiserToSend.sendLead(lead, advertiserId);
            const advertiserCheckData = [];

            const sendStatus = sendLeadResult.sendStatus ? sendLeadResult.sendStatus : false;
            const responseStatus = sendLeadResult.status ? sendLeadResult.status : null;
            const responseBody = sendLeadResult.data ? JSON.stringify(sendLeadResult.data) : null;
            const formattedError = sendLeadResult.formattedError ? sendLeadResult.formattedError : null;

            if (sendStatus) {
                await capHelpers.updateAdvertiserCapSend(lead.offerId, advertiserId, leadLandingGroupName);
                await leadHelpers.updateLeadSendDetails(leadSendStatus, leadId, advertiserId, advertiserCheckData, responseStatus, responseBody, formattedError, advertiser.project);
                await leadHelpers.logLeadDetails(leadId, userId, 7, { advertiserInternalId: advertiser.internalId });
                await userHelpers.affiliateSuccessPostback(userId, lead);
            } else {
                await leadHelpers.updateLeadSendDetails(leadNotSendedStatus, leadId, advertiserId, advertiserCheckData,responseStatus, responseBody, formattedError, null);
                await leadHelpers.logLeadDetails(leadId, userId, 8, { advertiserInternalId: advertiser.internalId });
            }

            return handler.pResponse(res, {
                message: 'Lead send result',
                send: sendStatus
            }, req);
        }
    } catch(error) {
        logger.error('', error);
        return handler.errorMessage(res, error.message);
    }
};

exports.sendLeadToATrash = async (req, res) => {
    const { userId } = { ...req.userData };
    const { leadId } = { ...req.body };

    if (!leadId) return handler.errorMessage(res, 'Lead id cannot be empty!');
    if (!miscHelpers.isIdValidForMongo(leadId)) return handler.errorMessage(res, 'Lead id is not valid!');

    const advertiserId = '5e5ff32ef5985d1c3094849b';

    try {
        const advertiser = await Advertiser.findOne({ _id: advertiserId });
        const lead = await Lead.findOne({ _id: leadId });

        if(lead.isSending) {
            return await handler.errorMessage(res, 'Невозможно, лид записан на автоотправку');
        }

        if(!lead || !advertiser) {
            return await handler.errorMessage(res, 'Lead, or advertiser not found');
        } else {
            const advertiserToSend = advertiserHelpers.getAdvertiserApiTemplate(advertiser.internalId);
            const sendLeadResult = await advertiserToSend.sendLead(lead, advertiserId);
            const advertiserCheckData = [];

            const sendStatus = sendLeadResult.sendStatus ? sendLeadResult.sendStatus : false;
            const responseStatus = sendLeadResult.status ? sendLeadResult.status : null;
            const responseBody = sendLeadResult.data ? JSON.stringify(sendLeadResult.data) : null;
            const formattedError = sendLeadResult.formattedError ? sendLeadResult.formattedError : null;

            if (sendStatus) {
                // await capHelpers.updateAdvertiserCapSend(lead.offerId, advertiserId);
                await leadHelpers.updateLeadSendDetails(leadTrashStatus, leadId, advertiserId, advertiserCheckData, responseStatus, responseBody, formattedError, advertiser.project);
                await leadHelpers.logLeadDetails(leadId, userId, 7, { advertiserInternalId: advertiser.internalId });
            } else {
                await leadHelpers.updateLeadSendDetails(leadNotSendedStatus, leadId, advertiserId, advertiserCheckData,responseStatus, responseBody, formattedError, null);
                await leadHelpers.logLeadDetails(leadId, userId, 8, { advertiserInternalId: advertiser.internalId });
            }

            await handler.pResponse(res, {
                message: 'Lead send result',
                send: sendStatus
            }, req);
        }
    } catch(error) {
        await handler.errorMessage(res, error.message);
        logger.error('', error);
    }
};

exports.updateAdminLead = async (req, res) => {
    const { userId } = { ...req.userData };
    const leadId = req.params.id;
    const lead = { ...req.body };

    const validationRules = offerHelpers.getOfferValidationRules(0);

    try {
        const validationCheck = await leadHelpers.isLeadValid(lead,validationRules);

        const dataToReach = validationCheck.data;

        if (!validationCheck.isValid) {
            dataToReach.status = validationCheck.validationStatus;
            dataToReach.validationErrors = validationCheck.validationMessages;
        } else {
            dataToReach.status = leadValidStatus;
            dataToReach.validationErrors = [];
        }

        const updateStatus = await Lead.updateOne(
            {
                _id: leadId
            },
            {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                country: lead.country,
                town: lead.town,
                language: lead.language,
                ip: lead.ip,
                landing: lead.landing,
                prelanding: lead.prelanding,
                landingGroup: lead.landingGroup,
                landingGroupName: dataToReach.landingGroupName ? dataToReach.landingGroupName : null,
                prelandingGroup: lead.prelandingGroup,
                flowId: lead.flowId,
                offerId: dataToReach.offerId ? dataToReach.offerId : null,
                offerCategoryId: dataToReach.offerCategoryId ? dataToReach.offerCategoryId : null,
                status: dataToReach.status,
                validationErrors: dataToReach.validationErrors,
                // creator: lead.creator
            }
        );
        await leadHelpers.logLeadDetails(leadId, userId, 12, { newStatus: dataToReach.status });

        await handler.pResponse(res, {
            message: 'Admin lead updated',
            updated: updateStatus.nModified === 1 ? true : false,
            status: dataToReach.status,
        }, req);
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error);
    }
};

exports.updateLeadStatus = async (req, res) => {
    const { userId } = { ...req.userData };
    const leadId = req.params.id;
    const { oldStatus, newStatus} = { ...req.body };

    if (!leadId) return handler.errorMessage(res, 'Lead id cannot be empty!');
    if (!miscHelpers.isIdValidForMongo(leadId)) return handler.errorMessage(res, 'Lead id is not valid!');
    if (!oldStatus) return handler.errorMessage(res, 'Lead old status cannot be empty!');
    if (!newStatus) return handler.errorMessage(res, 'Lead new status be empty!');

    try {
        const updateResult = await leadHelpers.changeLeadStatus(leadId, oldStatus, newStatus);

        if(updateResult) {
            await leadHelpers.logLeadDetails(leadId, userId, 11, { oldStatus, newStatus });
        }

        return handler.pResponse(res, {
            message: `Lead updated`,
            updateResult,
            old: oldStatus,
            new: newStatus
        }, req);
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error);
    }
};

exports.getLead = async (req, res) => {
    const leadId = req.params.id;

    const userId = req.userData.userId;
    const role = req.userData.role;
    const filter = {};

    if (!leadId) return handler.errorMessage(res, `No 'id' parameter value.`);

    filter._id = leadId;

    if (role === affiliateRole) {
        filter.creator = userId;
    };

    let lead;
    try {
        lead = await Lead.findOne(filter);
        if (!lead) return handler.errorMessage(res, 'Lead not found.');
    } catch (error) {
        throw error;
    }

    return handler.pResponse(res, {
        message: 'Lead data',
        lead: lead
    }, req);
}

exports.getAffiliateLeads = async (req, res) => {
    const pageSize = +req.body.pageSize;
    const currentPage = +req.body.page;
    const sortColumn = req.body.sortColumn;
    const sortOrder = req.body.sortOrder;
    const filter = req.body.filter;

    const userId = req.userData.userId;
    const role = req.userData.role;

    const sortingMap = {
        asc: 1,
        desc: -1
    };

    const affiliateLeadColumns = 'firstName lastName ip country town status partnerStatus language landing prelanding flowId createdAt creator validationErrors sub1 sub2';

    const updatedFilterObject = dbHelpers.prepareMongoFilter(filter);
    // updatedFilterObject.creator = mongoose.Types.ObjectId(userId);

    let userIds;
    try {
        if(role === 'teamlead') {
            const user = await User.findOne({ _id: userId });
            const teamUsers = await User.find({ teamId: user.teamId }).select('_id');
            // Convert objects ids into plain array
            const teamUsersArray = teamUsers.map(u => mongoose.Types.ObjectId(u._id));
            userIds = { $in: teamUsersArray };
        } else if (role === 'affiliate') {
            userIds = mongoose.Types.ObjectId(userId);
        }
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error.message);
    }

    updatedFilterObject.creator = userIds;
    const sort = sortOrder ? { [sortColumn]: sortingMap[sortOrder] } : {};
    const leadsQuery = Lead.find(updatedFilterObject).select(affiliateLeadColumns);

    if (pageSize && currentPage) {
        leadsQuery
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize)
            .sort(sort)
    }

    let leads;
    let total;
    let flows;
    let affiliates;
    let mergedStatuses;
    try {
        leads = await leadsQuery;
        total = await Lead.count(updatedFilterObject);
        flows = await Flow.find({ creator: userIds }, { _id: 1, name: 1 });
        affiliates = await User.find({ _id: userIds }, { _id: 1, dashboardName: 1, team: 1 });

        delete updatedFilterObject.status;
        const statusesCount = await Lead.aggregate([
            {
                $match: updatedFilterObject
            },
            {
                $group : { _id: "$status", count: {$sum:1} }
            }
        ]);
        mergedStatuses = leadHelpers.leadStatusGroup(statusesCount);

    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error.message);
    }
    
    return handler.pResponse(res, {
        message: 'Leads list',
        leads,
        flows,
        affiliates,
        total,
        mergedStatuses
    }, req);
};

exports.getAffiliateLead = async (req, res) => {
    const leadId = req.params.id;

    const userId = req.userData.userId;
    const role = req.userData.role;
    const filter = {};

    const affiliateLeadColumns = 'firstName lastName email ip country town status partnerStatus language landing prelanding flowId createdAt creator sub1 sub2 sub3 sub4 sub5 sub6 sub7 sub8 sub9';

    if (!leadId) return handler.errorMessage(res, `No 'id' parameter value.`);
    if(!miscHelpers.isIdValidForMongo(leadId)) return handler.errorMessage(res, 'Lead id is not valid!');

    let userIds;
    try {
        if(role === 'teamlead') {
            const user = await User.findOne({ _id: userId });
            const teamUsers = await User.find({ teamId: user.teamId }).select('_id');
            // Convert objects ids into plain array
            const teamUsersArray = teamUsers.map(u => mongoose.Types.ObjectId(u._id));
            userIds = { $in: teamUsersArray };
        } else if (role === 'affiliate') {
            userIds = mongoose.Types.ObjectId(userId);
        }
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error.message);
    }

    filter.creator = userIds;
    filter._id = leadId;

    let lead;
    try {
        lead = await Lead.findOne(filter).select(affiliateLeadColumns);
        if (!lead) return handler.errorMessage(res, 'Lead not found.');

        await handler.pResponse(res, {
            message: 'Lead data',
            lead: lead
        }, req);
    } catch (error) {
        logger.error('', error);
        return handler.errorMessage(res, error.message);
    }
}

exports.updateAffiliateLead = async (req, res) => {
    const { userId } = { ...req.userData };
    const leadId = req.params.id;
    const lead = { ...req.body };

    const DUMMY_STRING = 'DUMMY';

    lead.creator = userId;
    lead.phone = DUMMY_STRING;
    lead.email = DUMMY_STRING;

    const validationRules = offerHelpers.getOfferValidationRules(0);

    try {
        const validationCheck = await leadHelpers.isLeadValid(lead,validationRules);

        const dataToReach = validationCheck.data;

        if (!validationCheck.isValid) {
            dataToReach.status = validationCheck.validationStatus;
            dataToReach.validationErrors = validationCheck.validationMessages;
        } else {
            dataToReach.status = leadValidStatus;
            dataToReach.validationErrors = [];
        }

        const updateStatus = await Lead.updateOne(
            {
                _id: leadId,
                creator: lead.creator
            },
            {
                firstName: lead.firstName,
                lastName: lead.lastName,
                country: lead.country,
                language: lead.language,
                landing: lead.landing,
                prelanding: lead.prelanding,
                landingGroup: lead.landingGroup,
                landingGroupName: dataToReach.landingGroupName ? dataToReach.landingGroupName : null,
                flowId: lead.flowId,
                offerId: dataToReach.offerId ? dataToReach.offerId : null,
                offerCategoryId: dataToReach.offerCategoryId ? dataToReach.offerCategoryId : null,
                status: dataToReach.status,
                validationErrors: dataToReach.validationErrors,
                // creator: lead.creator
            }
        );
        await leadHelpers.logLeadDetails(leadId, userId, 12, { newStatus: dataToReach.status });

        await handler.pResponse(res, {
            message: 'Affiliate lead updated',
            updated: updateStatus.nModified === 1 ? true : false,
            status: dataToReach.status,
        }, req);
    } catch (error) {
        logger.error('', error);
        handler.errorMessage(res, error.message);
    }
};

exports.updateLeadOwner = async (req, res) => {
    const { creatorOld, creatorNew } = { ...req.body };
    
    let updateStatus;
    try {
        updateStatus = await Lead.updateMany({"creator": creatorOld}, {"$set":{"creator": creatorNew}});
    } catch (error) {
        logger.error('', error);
        handler.errorMessage(res, error);
    }

    await handler.pResponse(res, {
        message: `Lead updated`,
        updateStatus: updateStatus
    }, req);
};

exports.moveLeadsFromValidToTrash = async (req, res) => {
    try {
        const result = await capsHelpers.moveValidLeadsToTrash();

        await handler.pResponse(res, {
            updated: result
        }, req);
    } catch (error) {
        logger.error('', error);
        handler.errorMessage(res, error);
    }
};

exports.getHoldLeadsByOffer = async (req, res) => {
    const groupValue = '$offerId';
    const joinedCollection = 'offers';

    const sharedFilter = {
        status: 'ХОЛД'
    };

    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: sharedFilter },
            { $group: { _id: groupValue, holdLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },

        { $project: { Union: { $concatArrays: ['$Collection1'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
        holdLeads: {$sum: '$holdLeads'}
        }},

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: { $ifNull: [ '$joinDetails.name', 'EMPTY'] } } },
  
        { $project: { joinDetails: 0 } }

    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['name'], ['asc']);

    await handler.pResponse(res, {
        message: 'Hold leads aggregated by offers',
        aggregation: sortedAggregation,
    }, req);
}

exports.shiftPartnerLeads = async (req, res) => {
    const { userId } = { ...req.userData };
    const { emails, advertiser } = {...req.body};

    if (!emails) return handler.errorMessage(res, 'Emails cannot be empty!');
    if (emails.length === 0) return handler.errorMessage(res, 'Emails cannot be empty!');
    if (!advertiser) return handler.errorMessage(res, 'Advertiser cannot be empty!');

    const oldStatus = 'ОТПРАВЛЕННЫЙ';
    const newStatus = 'ТРЕШ';

    let updatedEmails = 0;
    const notUpdatedEmails = [];

    try {
        for(const email of emails) {
            const result = await Lead.findOneAndUpdate(
                {
                    advertiser: advertiser,
                    email: email.toLowerCase(),
                    status: oldStatus,
                }, {
                    status: newStatus,
                }, {
                    new: true
                }
            );

            if (result) {
                const leadId = result._id;
                updatedEmails += 1;
                await leadHelpers.logLeadDetails(leadId, userId, 14, { oldStatus, newStatus });
            } else {
                notUpdatedEmails.push(email);
            }
        }
       
        return await handler.pResponse(res, {
            message: 'Test',
            isAllUpdated: emails.length === updatedEmails ? true : false,
            notUpdatedEmails
        }, req);
    } catch(error) {
        logger.error('', error);
        handler.errorMessage(res, error);
    }
};

exports.testLeadSend = async (req, res) => {
    const advertiserId = req.params.advertiser_id;
    const lead = {...req.body};

    const TEST_LEAD = true;

    try {
        const advertiser = await Advertiser.findOne({
            _id: advertiserId
        });
        const advertiserToSend = advertiserHelpers.getAdvertiserApiTemplate(advertiser.internalId);
        // const methods = advertiserHelpers.getAdvertiserMethods(partner);
        const sendLeadResult = await advertiserToSend.sendLead(lead, advertiserId, TEST_LEAD);

        await handler.pResponse(res, {
            email: lead.email,
            sendLeadResult
        }, req);
    } catch (error) {
        return handler.errorMessage(res, error.message);
    }
}

exports.testSelectionOfAdvertisers = async (req, res) => {
    const { offer, country, domain } = { ...req.body };
    const selection = await capsHelpers.getAdvertiserToSend(offer, country, domain);

    await handler.pResponse(res, {
        selection
    }, req);
}