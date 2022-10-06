const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');
const dbHelpers = require('../helpers/db-helpers');
const miscHelpers = require('../helpers/misc');
const mongoose = require('mongoose');
const _ = require('lodash');
const moment = require('moment');

const User = require('../models/Users');
const Offer = require('../models/Offers');
const Lead = require('../models/Leads');
const Advertiser = require('../models/Advertisers');
const Flow = require('../models/Flows');
const Dimension = require('../models/Dimensions');

const affiliateRole = 'affiliate';

exports.getAdminCardsData = async(req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ],
    };

    if(project) {
        sharedFilter.project = {
            $in: [ project, null ]
        }
    }

    const allLeadsFilter = sharedFilter;
    const aggrHoldLeadsFilter = dbHelpers.getLeadStatusGroupFilter('hold', sharedFilter);
    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);
    const aggrNotSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notsend', sharedFilter);
    const aggrValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('valid', sharedFilter);
    const aggrNotValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notvalid', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadStatusGroupFilter('trash', sharedFilter);

    try {
        const allLeads = await Lead.find(allLeadsFilter).count();
        const holdLeads = await Lead.find(aggrHoldLeadsFilter).count();
        const sendLeads = await Lead.find(aggrSendLeadsFilter).count();
        const notSendLeads = await Lead.find(aggrNotSendLeadsFilter).count();
        const validLeads = await Lead.find(aggrValidLeadsFilter).count();
        const notValidLeads = await Lead.find(aggrNotValidLeadsFilter).count();
        const trashLeads = await Lead.find(aggrTrashLeadsFilter).count();

        await handler.pResponse(res, {
            message: 'Admin dashboard cards data',
            allLeads: allLeads,
            holdLeads: holdLeads,
            sendLeads: sendLeads,
            notSendLeads: notSendLeads,
            validLeads: validLeads,
            notValidLeads: notValidLeads,
            trashLeads: trashLeads
        }, req);
    } catch (error) {
        logger.error('', error);
    }
}

exports.getTotalAdvertisers = async (req, res) => {
    let total;
    try {
        total = await Advertiser.find().count();
    } catch (error) {
        logger.error('', error);
    }
    handler.pResponse(res, {
        message: 'Total advertisers',
        total: total
    }, req);
};

exports.getTotalAffiliates = async (req, res) => {
    let total;
    try {
        total = await User.find({ role: affiliateRole }).count();
    } catch (error) {
        logger.error('', error);
    }
    handler.pResponse(res, {
        message: 'Total affiliates',
        total: total
    }, req);
};

exports.aggrLeadsByAffiliates = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };
    
    const groupValue = '$creator';
    const joinedCollection = 'users';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    if(project) {
        sharedFilter.project = {
            $in: [ project, null ]
        }
    }

    const allLeadsFilter = sharedFilter;
    const aggrHoldLeadsFilter = dbHelpers.getLeadStatusGroupFilter('hold', sharedFilter);
    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);
    const aggrNotSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notsend', sharedFilter);
    const aggrValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('valid', sharedFilter);
    const aggrNotValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notvalid', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadStatusGroupFilter('trash', sharedFilter);

    // https://stackoverflow.com/questions/46090741/how-to-write-union-queries-in-mongodb
    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: allLeadsFilter },
            { $group: { _id: groupValue, allLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrHoldLeadsFilter },
            { $group: { _id: groupValue, holdLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendLeadsFilter },
            { $group: { _id: groupValue, sendLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotSendLeadsFilter },
            { $group: { _id: groupValue, notSendLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrValidLeadsFilter },
            { $group: { _id: groupValue, validLeads: { $sum: 1 }} }
        ], as: 'Collection5' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotValidLeadsFilter },
            { $group: { _id: groupValue, notValidLeads: { $sum: 1 }} }
        ], as: 'Collection6' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrTrashLeadsFilter },
            { $group: { _id: groupValue, trashLeads: { $sum: 1 }} }
        ], as: 'Collection7' } },

        { $project: { Union: { $concatArrays: ['$Collection1', '$Collection2', '$Collection3', '$Collection4', '$Collection5', '$Collection6', '$Collection7'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
            allLeads: {$sum: '$allLeads'},
            holdLeads: {$sum: '$holdLeads'},
            sendLeads: {$sum: '$sendLeads'},
            notSendLeads: {$sum: '$notSendLeads'},
            validLeads: {$sum: '$validLeads'},
            notValidLeads: {$sum: '$notValidLeads'},
            trashLeads: {$sum: '$trashLeads'}
        } },

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $lookup: { from: 'teams', localField: 'joinDetails.teamId', foreignField: '_id', as: 'teamDetails'} },

        { $unwind : { path: '$teamDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: { $ifNull: [ '$joinDetails.dashboardName', 'EMPTY'] }, team: { $ifNull: [ '$joinDetails.team', 'EMPTY'] } } },

        { $addFields: { teamName: { $ifNull: [ '$teamDetails.name', 'EMPTY'] } } },
  
        { $project: { joinDetails: 0 } },

        { $project: { teamDetails: 0 } }

    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['team', 'name'], ['asc', 'asc']);

    await handler.pResponse(res, {
        message: 'Leads aggregated by affiliate',
        aggregation: sortedAggregation,
    }, req);
}

exports.aggrLeadsByPartnerStatus = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };
    
    const groupValue = '$creator';
    const joinedCollection = 'users';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    
    if(project) {
        sharedFilter.project = {
            $in: [ project, null ]
        }
    }

    const allLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('all', sharedFilter);
    const aggrNewLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('new', sharedFilter);
    const aggrCallbackLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('callback', sharedFilter);
    const aggrMissedLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('missed', sharedFilter);
    const aggrConfirmedLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('confirmed', sharedFilter);
    const aggrInvalidLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('invalid', sharedFilter);
    const aggrCancelLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('cancel', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('trash', sharedFilter);
    const aggrDoubleLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('double', sharedFilter);

    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: allLeadsFilter },
            { $group: { _id: groupValue, allLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNewLeadsFilter },
            { $group: { _id: groupValue, newLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrCallbackLeadsFilter },
            { $group: { _id: groupValue, callbackLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrMissedLeadsFilter },
            { $group: { _id: groupValue, missedLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrConfirmedLeadsFilter },
            { $group: { _id: groupValue, confirmedLeads: { $sum: 1 }} }
        ], as: 'Collection5' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrInvalidLeadsFilter },
            { $group: { _id: groupValue, invalidLeads: { $sum: 1 }} }
        ], as: 'Collection6' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrCancelLeadsFilter },
            { $group: { _id: groupValue, cancelLeads: { $sum: 1 }} }
        ], as: 'Collection7' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrTrashLeadsFilter },
            { $group: { _id: groupValue, trashLeads: { $sum: 1 }} }
        ], as: 'Collection8' } },
              { $lookup: { from: 'leads', pipeline: [
            { $match: aggrDoubleLeadsFilter },
            { $group: { _id: groupValue, doubleLeads: { $sum: 1 }} }
        ], as: 'Collection9' } },

        { $project: { Union: { $concatArrays: 
            [ '$Collection1','$Collection2', '$Collection3', '$Collection4', '$Collection5', '$Collection6', '$Collection7', '$Collection8', '$Collection9'] 
        }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
            allLeads: {$sum: '$allLeads'},
            newLeads: {$sum: '$newLeads'},
            callbackLeads: {$sum: '$callbackLeads'},
            missedLeads: {$sum: '$missedLeads'},
            confirmedLeads: {$sum: '$confirmedLeads'},
            invalidLeads: {$sum: '$invalidLeads'},
            cancelLeads: {$sum: '$cancelLeads'},
            trashLeads: {$sum: '$trashLeads'},
            doubleLeads: {$sum: '$doubleLeads'},
        } },

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: { $ifNull: [ '$joinDetails.dashboardName', 'EMPTY'] }, team: { $ifNull: [ '$joinDetails.team', 'EMPTY'] } } },
  
        { $project: { joinDetails: 0 } }

    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['team', 'name'], ['asc', 'asc']);

    await handler.pResponse(res, {
        message: 'Leads aggregated by affiliate',
        aggregation: sortedAggregation,
    }, req);
}

exports.aggrLeadsByOffers = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };

    const groupValue = '$offerId';
    const joinedCollection = 'offers';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    if(project) {
        sharedFilter.project = {
            $in: [ project, null ]
        }
    }

    const allLeadsFilter = sharedFilter;
    const aggrHoldLeadsFilter = dbHelpers.getLeadStatusGroupFilter('hold', sharedFilter);
    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);
    const aggrNotSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notsend', sharedFilter);
    const aggrValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('valid', sharedFilter);
    const aggrNotValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notvalid', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadStatusGroupFilter('trash', sharedFilter);

    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: allLeadsFilter },
            { $group: { _id: groupValue, allLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrHoldLeadsFilter },
            { $group: { _id: groupValue, holdLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendLeadsFilter },
            { $group: { _id: groupValue, sendLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotSendLeadsFilter },
            { $group: { _id: groupValue, notSendLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrValidLeadsFilter },
            { $group: { _id: groupValue, validLeads: { $sum: 1 }} }
        ], as: 'Collection5' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotValidLeadsFilter },
            { $group: { _id: groupValue, notValidLeads: { $sum: 1 }} }
        ], as: 'Collection6' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrTrashLeadsFilter },
            { $group: { _id: groupValue, trashLeads: { $sum: 1 }} }
        ], as: 'Collection7' } },

        { $project: { Union: { $concatArrays: ['$Collection1', '$Collection2', '$Collection3', '$Collection4', '$Collection5', '$Collection6', '$Collection7'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
        allLeads: {$sum: '$allLeads'},
        holdLeads: {$sum: '$holdLeads'},
        sendLeads: {$sum: '$sendLeads'},
        notSendLeads: {$sum: '$notSendLeads'},
        validLeads: {$sum: '$validLeads'},
        notValidLeads: {$sum: '$notValidLeads'},
        trashLeads: {$sum: '$trashLeads'}
        }},

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: { $ifNull: [ '$joinDetails.name', 'EMPTY'] } } },
  
        { $project: { joinDetails: 0 } }

    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['name'], ['asc']);

    await handler.pResponse(res, {
        message: 'Leads aggregated by offers',
        aggregation: sortedAggregation,
    }, req);
}

exports.aggrLeadsByPartners = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };

    const groupValue = '$advertiser';
    const joinedCollection = 'advertisers';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        sendDate: {
            $gte: startDate,
            $lte: endDate
        },
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    if(project) {
        sharedFilter.project = {
            $in: [ project, null ]
        }
    }

    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);

    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendLeadsFilter },
            { $group: { _id: groupValue, sendLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },

        { $project: { Union: { $concatArrays: ['$Collection1'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
        sendLeads: {$sum: '$sendLeads'},
        }},

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: '$joinDetails.name' } },
  
        { $project: { joinDetails: 0, _id: 0 } }

    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['name'], ['asc']);

    await handler.pResponse(res, {
        message: 'Leads aggregated by partners',
        aggregation: sortedAggregation,
    }, req);
}

exports.getAffiliateCardsData = async(req, res) => {
    const userId = req.userData.userId;
    const role = req.userData.role;
   
    const { startDateString, endDateString } = { ...req.body };

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        // creator: userId
    };

    try {
        if(role === 'teamlead') {
            const user = await User.findOne({ _id: userId });
            const teamUsers = await User.find({ team: user.team }).select('_id');
            const teamUsersArray = teamUsers.map(u => u._id);

            sharedFilter.creator = { $in: teamUsersArray };
        } else if (role === 'affiliate') {
            sharedFilter.creator = userId;
        }
    } catch (error) {
        logger.error('', error);
    }

    const allLeadsFilter = sharedFilter;
    const aggrHoldLeadsFilter = dbHelpers.getLeadStatusGroupFilter('hold', sharedFilter);
    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);
    const aggrNotSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notsend', sharedFilter);
    const aggrValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('valid', sharedFilter);
    const aggrNotValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notvalid', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadStatusGroupFilter('trash', sharedFilter);

    try {
        const allLeads = await Lead.find(allLeadsFilter).count();
        const holdLeads = await Lead.find(aggrHoldLeadsFilter).count();
        const sendLeads = await Lead.find(aggrSendLeadsFilter).count();
        const notSendLeads = await Lead.find(aggrNotSendLeadsFilter).count();
        const validLeads = await Lead.find(aggrValidLeadsFilter).count();
        const notValidLeads = await Lead.find(aggrNotValidLeadsFilter).count();
        const trashLeads = await Lead.find(aggrTrashLeadsFilter).count();

        await handler.pResponse(res, {
            message: 'Admin dashboard cards data',
            allLeads: allLeads,
            holdLeads: holdLeads,
            sendLeads: sendLeads,
            notSendLeads: notSendLeads,
            validLeads: validLeads,
            notValidLeads: notValidLeads,
            trashLeads: trashLeads
        }, req);
    } catch (error) {
        logger.error('', error);
    }
}

exports.aggrLeadsByFlows = async (req, res) => {
    const { startDateString, endDateString } = { ...req.body };

    const userId = req.userData.userId;
    // const role = req.userData.role;

    const groupValue = '$flowId';
    const joinedCollection = 'flows';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        creator: mongoose.Types.ObjectId(userId)
    };

    // try {
    //     if(role === 'teamlead') {
    //         const user = await User.findOne({ _id: userId });
    //         const teamUsers = await User.find({ team: user.team }).select('_id');
    //         const teamUsersArray = teamUsers.map(u => u._id);

    //         sharedFilter.creator = { $in: teamUsersArray };
    //     } else if (role === 'affiliate') {
    //         sharedFilter.creator = userId;
    //     }
    // } catch (error) {
    //     logger.error('', error);
    // }

    const allLeadsFilter = sharedFilter;
    const aggrHoldLeadsFilter = dbHelpers.getLeadStatusGroupFilter('hold', sharedFilter);
    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);
    const aggrNotSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notsend', sharedFilter);
    const aggrValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('valid', sharedFilter);
    const aggrNotValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notvalid', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadStatusGroupFilter('trash', sharedFilter);

    // https://stackoverflow.com/questions/46090741/how-to-write-union-queries-in-mongodb
    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: allLeadsFilter },
            { $group: { _id: groupValue, allLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrHoldLeadsFilter },
            { $group: { _id: groupValue, holdLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendLeadsFilter },
            { $group: { _id: groupValue, sendLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotSendLeadsFilter },
            { $group: { _id: groupValue, notSendLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrValidLeadsFilter },
            { $group: { _id: groupValue, validLeads: { $sum: 1 }} }
        ], as: 'Collection5' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotValidLeadsFilter },
            { $group: { _id: groupValue, notValidLeads: { $sum: 1 }} }
        ], as: 'Collection6' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrTrashLeadsFilter },
            { $group: { _id: groupValue, trashLeads: { $sum: 1 }} }
        ], as: 'Collection7' } },

        { $project: { Union: { $concatArrays: ['$Collection1', '$Collection2', '$Collection3', '$Collection4', '$Collection5', '$Collection6', '$Collection7'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
            allLeads: {$sum: '$allLeads'},
            holdLeads: {$sum: '$holdLeads'},
            sendLeads: {$sum: '$sendLeads'},
            notSendLeads: {$sum: '$notSendLeads'},
            validLeads: {$sum: '$validLeads'},
            notValidLeads: {$sum: '$notValidLeads'},
            trashLeads: {$sum: '$trashLeads'}
        }},

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: { $ifNull: [ '$joinDetails.name', 'ПУСТОЙ'] } } },
  
        { $project: { joinDetails: 0 } }
    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['name'], ['asc']);

    return handler.pResponse(res, {
        message: 'Leads aggregated by flows',
        aggregation: sortedAggregation
    }, req);
}

exports.affAggrLeadsByPartnerStatus = async (req, res) => {
    const userId = req.userData.userId;
    const { startDateString, endDateString, offerCategory } = { ...req.body };
    
    const groupValue = '$offerId';
    const joinedCollection = 'offers';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        // $or: [
        //     { offerCategoryId: offerCategory },
        //     { offerCategoryId: null }
        // ],
        creator: mongoose.Types.ObjectId(userId)
    };

    const allLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('all', sharedFilter);
    const aggrNewLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('new', sharedFilter);
    const aggrCallbackLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('callback', sharedFilter);
    const aggrMissedLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('missed', sharedFilter);
    const aggrConfirmedLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('confirmed', sharedFilter);
    const aggrInvalidLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('invalid', sharedFilter);
    const aggrCancelLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('cancel', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('trash', sharedFilter);
    const aggrDoubleLeadsFilter = dbHelpers.getLeadPartnerStatusGroupFilter('double', sharedFilter);

    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: allLeadsFilter },
            { $group: { _id: groupValue, allLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNewLeadsFilter },
            { $group: { _id: groupValue, newLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrCallbackLeadsFilter },
            { $group: { _id: groupValue, callbackLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrMissedLeadsFilter },
            { $group: { _id: groupValue, missedLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrConfirmedLeadsFilter },
            { $group: { _id: groupValue, confirmedLeads: { $sum: 1 }} }
        ], as: 'Collection5' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrInvalidLeadsFilter },
            { $group: { _id: groupValue, invalidLeads: { $sum: 1 }} }
        ], as: 'Collection6' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrCancelLeadsFilter },
            { $group: { _id: groupValue, cancelLeads: { $sum: 1 }} }
        ], as: 'Collection7' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrTrashLeadsFilter },
            { $group: { _id: groupValue, trashLeads: { $sum: 1 }} }
        ], as: 'Collection8' } },
              { $lookup: { from: 'leads', pipeline: [
            { $match: aggrDoubleLeadsFilter },
            { $group: { _id: groupValue, doubleLeads: { $sum: 1 }} }
        ], as: 'Collection9' } },

        { $project: { Union: { $concatArrays: 
            [ '$Collection1','$Collection2', '$Collection3', '$Collection4', '$Collection5', '$Collection6', '$Collection7', '$Collection8', '$Collection9'] 
        }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
            allLeads: {$sum: '$allLeads'},
            newLeads: {$sum: '$newLeads'},
            callbackLeads: {$sum: '$callbackLeads'},
            missedLeads: {$sum: '$missedLeads'},
            confirmedLeads: {$sum: '$confirmedLeads'},
            invalidLeads: {$sum: '$invalidLeads'},
            cancelLeads: {$sum: '$cancelLeads'},
            trashLeads: {$sum: '$trashLeads'},
            doubleLeads: {$sum: '$doubleLeads'},
        } },

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: '$joinDetails.name' } },
  
        { $project: { joinDetails: 0 } }

    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['name'], ['asc']);

    await handler.pResponse(res, {
        message: 'Affiliate leads aggregated by partner status',
        aggregation: sortedAggregation,
    }, req);
};

exports.affAggrLeadsByAffiliates = async (req, res) => {
    const { startDateString, endDateString } = { ...req.body };

    const userId = req.userData.userId;
    const role = req.userData.role;

    const groupValue = '$creator';
    const joinedCollection = 'users';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        // creator: mongoose.Types.ObjectId(userId)
    };

    try {
        if(role === 'teamlead') {
            const user = await User.findOne({ _id: userId });
            const teamUsers = await User.find({ team: user.team }).select('_id');
            // COnvert objects ids into plain array
            const teamUsersArray = teamUsers.map(u => u._id);

            sharedFilter.creator = { $in: teamUsersArray };
        } else if (role === 'affiliate') {
            sharedFilter.creator = userId;
        }
    } catch (error) {
        logger.error('', error);
    }

    const allLeadsFilter = sharedFilter;
    const aggrHoldLeadsFilter = dbHelpers.getLeadStatusGroupFilter('hold', sharedFilter);
    const aggrSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', sharedFilter);
    const aggrNotSendLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notsend', sharedFilter);
    const aggrValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('valid', sharedFilter);
    const aggrNotValidLeadsFilter = dbHelpers.getLeadStatusGroupFilter('notvalid', sharedFilter);
    const aggrTrashLeadsFilter = dbHelpers.getLeadStatusGroupFilter('trash', sharedFilter);

    // https://stackoverflow.com/questions/46090741/how-to-write-union-queries-in-mongodb
    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: allLeadsFilter },
            { $group: { _id: groupValue, allLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrHoldLeadsFilter },
            { $group: { _id: groupValue, holdLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendLeadsFilter },
            { $group: { _id: groupValue, sendLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotSendLeadsFilter },
            { $group: { _id: groupValue, notSendLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrValidLeadsFilter },
            { $group: { _id: groupValue, validLeads: { $sum: 1 }} }
        ], as: 'Collection5' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrNotValidLeadsFilter },
            { $group: { _id: groupValue, notValidLeads: { $sum: 1 }} }
        ], as: 'Collection6' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrTrashLeadsFilter },
            { $group: { _id: groupValue, trashLeads: { $sum: 1 }} }
        ], as: 'Collection7' } },

        { $project: { Union: { $concatArrays: ['$Collection1', '$Collection2', '$Collection3', '$Collection4', '$Collection5', '$Collection6', '$Collection7'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
            allLeads: {$sum: '$allLeads'},
            holdLeads: {$sum: '$holdLeads'},
            sendLeads: {$sum: '$sendLeads'},
            notSendLeads: {$sum: '$notSendLeads'},
            validLeads: {$sum: '$validLeads'},
            notValidLeads: {$sum: '$notValidLeads'},
            trashLeads: {$sum: '$trashLeads'}
        }},

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { name: { $ifNull: [ '$joinDetails.dashboardName', 'ПУСТОЙ'] } } },
  
        { $project: { joinDetails: 0 } }
    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['name'], ['asc']);

    return handler.pResponse(res, {
        message: 'Leads aggregated by flows',
        aggregation: sortedAggregation
    }, req);
}

exports.aggrSendedLeadsByOffers = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };

    const groupValue = "$creator";

    const joinedCollection = 'users';

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const ruLeadsFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        offerId: mongoose.Types.ObjectId('5de45649bc73660a08b3f812'),
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    const rueuLeadsFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        offerId: mongoose.Types.ObjectId('5de573a4baeabe22b213842d'),
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    }

    const euLeadsFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        offerId: mongoose.Types.ObjectId('5ded1962dfc7917b25787b8c'),
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    const nativeLeadsFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        offerId: mongoose.Types.ObjectId('5ded196cdfc7917b25787b8d'),
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    if(project) {
        ruLeadsFilter.project = {
            $in: [ project, null ]
        };
        rueuLeadsFilter.project = {
            $in: [ project, null ]
        };
        euLeadsFilter.project = {
            $in: [ project, null ]
        };
        nativeLeadsFilter.project = {
            $in: [ project, null ]
        };
    }


    const aggrSendRuLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', ruLeadsFilter);
    const aggrSendRueuLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', rueuLeadsFilter);
    const aggrSendEuLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', euLeadsFilter);
    const aggrSendNativeLeadsFilter = dbHelpers.getLeadStatusGroupFilter('send', nativeLeadsFilter);

    // https://stackoverflow.com/questions/46090741/how-to-write-union-queries-in-mongodb
    const aggrLeads = await Lead.aggregate([
        { $limit: 1 }, // Reduce the result set to a single document.
        { $project: { _id: 1 } }, // Strip all fields except the Id.
        { $project: { _id: 0 } }, // Strip the id. The document is now empty.

        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendRuLeadsFilter },
            { $group: { _id: groupValue, ruLeads: { $sum: 1 }} }
        ], as: 'Collection1' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendRueuLeadsFilter },
            { $group: { _id: groupValue, rueuLeads: { $sum: 1 }} }
        ], as: 'Collection2' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendEuLeadsFilter },
            { $group: { _id: groupValue, euLeads: { $sum: 1 }} }
        ], as: 'Collection3' } },
        { $lookup: { from: 'leads', pipeline: [
            { $match: aggrSendNativeLeadsFilter },
            { $group: { _id: groupValue, nativeLeads: { $sum: 1 }} }
        ], as: 'Collection4' } },

        { $project: { Union: { $concatArrays: ['$Collection1', '$Collection2', '$Collection3', '$Collection4'] }} },

        { $unwind: '$Union' }, // Unwind the union collection into a result set.

        { $replaceRoot: { newRoot: '$Union' } }, // Replace the root to cleanup the resulting documents.

        { $group: { _id: '$_id', 
            ruLeads: {$sum: '$ruLeads'},
            rueuLeads: {$sum: '$rueuLeads'},
            euLeads: {$sum: '$euLeads'},
            nativeLeads: {$sum: '$nativeLeads'}
        }},

        { $lookup: { from: joinedCollection, localField: '_id', foreignField: '_id', as: 'joinDetails'} },

        { $unwind : { path: '$joinDetails', 'preserveNullAndEmptyArrays': true } },

        { $addFields: { affiliateName: { $ifNull: [ '$joinDetails.dashboardName', 'ПУСТОЙ'] } } },
  
        { $project: { joinDetails: 0, _id: 0 } }
    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['affiliateName'], ['asc']);

    await handler.pResponse(res, {
        message: 'Leads aggregated by flows',
        aggregation: sortedAggregation
    }, req);
}

exports.aggrSendedLeadsByTeamOffer = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const aggrLeads = await Lead.aggregate([
        { $match: { 
            status: "ОТПРАВЛЕННЫЙ",
            createdAt: {
                $gte: startDate,
                $lte: endDate
            },
            ...(project && { project: { $in: [project, null]} })
        }},
        { $project: {
            creator: 1,
            status: 1,
            offerId: 1,
            ruLead: { $cond: [{ $eq: [ '$offerId', mongoose.Types.ObjectId('5de45649bc73660a08b3f812')] },1,0] }, 
            rueuLeads: { $cond: [{ $eq: [ '$offerId', mongoose.Types.ObjectId('5de573a4baeabe22b213842d')] },1,0] },
            euLeads: { $cond: [{ $eq: [ '$offerId', mongoose.Types.ObjectId('5ded1962dfc7917b25787b8c')] },1,0] },
            nativeLeads: { $cond: [{ $eq: [ '$offerId', mongoose.Types.ObjectId('5ded196cdfc7917b25787b8d')] },1,0] }
        } },

        { $lookup: { from: 'users', localField: 'creator', foreignField: '_id', as: 'userData'} }, // Join user data
        { $addFields: { teamId: { $arrayElemAt: [ "$userData.teamId", 0 ] } } },

        { $lookup: { from: 'teams', localField: 'teamId', foreignField: '_id', as: 'teamData'} }, // Join user data
        { $addFields: { teamName: { $arrayElemAt: [ "$teamData.name", 0 ] } } },

        { $project: {
            teamName: 1,
            ruLead: 1,
            rueuLeads: 1,
            euLeads: 1,
            nativeLeads: 1
        } },

        { $group: { _id: '$teamName', 
            ruLeads: {$sum: '$ruLead'},
            rueuLeads: {$sum: '$rueuLead'},
            euLeads: {$sum: '$euLead'},
            nativeLeads: {$sum: '$nativeLead'}
        }},
    ]);

    const sortedAggregation = _.orderBy(aggrLeads, ['_id'], ['asc']);

    await handler.pResponse(res, {
        message: 'Leads aggregated by flows',
        aggregation: sortedAggregation,
    }, req);
}

exports.aggrSendLeadsByOfferDateSerries = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const dimenssionId = '5e7a14dcaee0653ea473e5a9';

    const sharedFilter = {
        status: 'ОТПРАВЛЕННЫЙ',
        project
    }

    // if(project) {
    //     sharedFilter.project = {
    //         $in: [ project, null ]
    //     };
    // }

    try {
        const datesPrepared = await Dimension.aggregate([
            // Add date dimension
            {
                $match: {
                    _id: mongoose.Types.ObjectId(dimenssionId)
                },
            },
            {
                $unwind: '$dates',
            },
            {
                $project: {
                    _id: 0,
                    date: '$dates',
                    day: { $dateToString: { format: "%Y-%m-%d", date: "$dates", timezone: '+02' } },
                }
            },
            {
                $match: {
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            // Add all offers
            { $lookup: { from: 'offers', pipeline: [
                { $match: { 'categories.id': offerCategory } },
                { $project: { _id: 1 } },
                { $addFields: { count: 0 } }
            ], as: 'offers' } },
            {
                $unwind : { path: '$offers', 'preserveNullAndEmptyArrays': true },
            },
            {
                $project: {
                    date: 1,
                    day: 1,
                    offerId: '$offers._id'
                }
            },
            {
                $lookup:
                   {
                     from: "leads",
                     let: { order_item: "$day", offer_item: "$offerId" },
                     pipeline: [
                        { 
                            $project: {
                                day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: '+02' } },
                                offerId: 1,
                                status: 1,
                                project: 1
                            }
                        },
                        { 
                            $match: { 
                                $expr: {
                                    $and: [
                                            { $eq: [ "$day",  "$$order_item" ] },
                                            { $eq: [ "$offerId",  "$$offer_item" ] },
                                    ]
                                },
                                project,
                                status: 'ОТПРАВЛЕННЫЙ',
                            }, 
                        },
                        { 
                            $project: { _id: 1 }
                        }
                     ],
                     as: "leads"
                }
            }, 
            {
                $project: {
                    date: 1,
                    day: 1,
                    offerId: 1,
                    count: { $size: '$leads' }
                }
            },
            {
                $group: {
                    _id: { offerId: '$offerId', date: '$day'},
                    total: { $sum: '$count' },
                }
            }, 
            {
                $sort : { '_id.offerId': 1, '_id.date' : 1 }
            },
            {
                $group: {
                    _id: '$_id.offerId',
                    data: { $push: "$total" },
                    labels: { $push: '$_id.date' }
                }
            },
            {
                $lookup: { from: 'offers', localField: '_id', foreignField: '_id', as: 'joinDetails'},
            },
            {
                $unwind : '$joinDetails',
            },
            {
                $addFields: {
                    label: '$joinDetails.name',
                    borderColor: '$joinDetails.offerChartColor',
                    fill: false,
                } 
            },
            {
                $project: { joinDetails: 0, _id: 0 }
            }
        ])

        const labels = datesPrepared[0].labels;
        const prepareDataset = datesPrepared.map(({labels, ...keepAttrs }) => keepAttrs);

        const chartData = {
            labels: labels,
            datasets: prepareDataset
        }

        return await handler.pResponse(res, {
            message: 'Aggregated lead time serries data',
            aggregation: chartData,
        }, req);
       
    } catch(error) {
        logger.error('', error);
        handler.errorMessage(res, error.message);
    }
};

exports.aggrSendLeadsByAffiliatePartnerLanding = async (req, res) => {
    const { startDateString, endDateString, offerCategory, project } = { ...req.body };
    

    const startDate = miscHelpers.returnStartDateWithUTC(startDateString);
    const endDate = miscHelpers.returnEndDateWithUTC(endDateString);

    const sharedFilter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        },
        status: 'ОТПРАВЛЕННЫЙ',
        $or: [
            { offerCategoryId: offerCategory },
            { offerCategoryId: null }
        ]
    };

    if(project) {
        sharedFilter.project = {
            $in: [ project, null ]
        };
    }

    const aggregation = await Lead.aggregate([
        {
            $match: sharedFilter
        }, 
        {
            $group: {
                '_id': {
                    'creator': '$creator',
                    'advertiser': '$advertiser',
                    'landingGroup': '$landingGroup'
                },
                'count': {
                    '$sum': 1
                }
            }
        }, {
            $lookup: {
                'from': 'users',
                'localField': '_id.creator',
                'foreignField': '_id',
                'as': 'user'
            }
        }, {
            $unwind: {
                'path': '$user',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            $addFields: {
                'affiliateName': '$user.dashboardName'
            }
        }, {
            $lookup: {
                'from': 'advertisers',
                'localField': '_id.advertiser',
                'foreignField': '_id',
                'as': 'advertiser'
            }
        }, {
            $unwind: {
                'path': '$advertiser',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            $addFields: {
                'advertiserName': '$advertiser.name',
                'landinGroup': '$_id.landingGroup'
            }
        }, {
            $project: {
                _id: 0, user: 0, advertiser: 0
            }
        }, {
            $sort: {
                affiliateName: 1,
                advertiserName: 1,
                landinGroup: 1,
            }
        }
    ]);

    await handler.pResponse(res, {
        message: 'Send leads by affiliate, partner, landing group',
        aggregation: aggregation,
    }, req);
};