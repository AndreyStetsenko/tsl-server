const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');
const _ = require('lodash');
const mongoose = require('mongoose');

const Advertiser = require('../models/Advertisers');
const Offer = require('../models/Offers');

exports.getAdvertisers = async (req, res) => {
    const advertisers = await Advertiser.find({}).sort({ isIntegrated: -1, project: 1, name: 1 });

    return handler.pResponse(res, {
        message: 'Advertisers list',
        advertisers: advertisers,
        total: advertisers.length
    }, req);
};

exports.getIntegratedAdvertisers = async (req, res) => {
    let advertisers;
    try {
        advertisers = await Advertiser.find({ isIntegrated: true });
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    return handler.pResponse(res, {
        message: 'Integrated advertisers list',
        advertisers: advertisers,
        total: advertisers.length
    }, req);
};

exports.getAdvertiser = async (req, res) => {
    const advertiserId = req.params.id;
    if (!advertiserId) return handler.errorMessage(res, `No 'id' parameter value.`);

    let advertiser;
    try {
        advertiser = await Advertiser.findOne({
            _id: advertiserId,
        });
        if (!advertiser) return handler.errorMessage(res, 'Advertiser not found.');
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    return handler.pResponse(res, {
        advertiser: advertiser
    }, req);
}

exports.addAdvertiser = async (req, res) => {
    const {
        internalId,
        name,
        project,
        description,
        website,
        domains,
        countries,
        isIntegrated,
        isRedirectAvailable,
        isCapsAvailable,
        callCenterFrom, 
        callCenterTo,
        landingGroups,
        sendDataType,
        defaultSendData,
        endpointSendLead,
        apiParameters
    } = { ...req.body };

    if (!name) return handler.errorMessage(res, 'Advertiser name cannot be empty!');
    if (countries.length === 0) return handler.errorMessage(res, 'Advertiser countries cannot be empty!');
    if (!callCenterFrom) return handler.errorMessage(res, 'callCenterFrom cannot be empty!');
    if (!callCenterTo) return handler.errorMessage(res, 'callCenterTo cannot be empty!');
    if (!sendDataType) return handler.errorMessage(res, 'sendDataType cannot be empty!');
    if (!endpointSendLead) return handler.errorMessage(res, 'endpointSendLead cannot be empty!');

    const advertiser = new Advertiser({
        internalId: internalId,
        name: name,
        project: project,
        description: description,
        website: website,
        landingGroups: landingGroups,
        domains: domains,
        countries: countries,
        isIntegrated: isIntegrated,
        isRedirectAvailable: isRedirectAvailable,
        isCapsAvailable: isCapsAvailable,
        callCenterWork: `${callCenterFrom}-${callCenterTo}`,
        sendDataType,
        defaultSendData,
        endpointSendLead,
        apiParameters
    });

    try {
        await advertiser.save();
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    return handler.pResponse(res, {
        message: 'Advertiser added.'
    }, req);
};

exports.updateAdvertiser = async (req, res) => {
    const { 
        internalId,
        name,
        description,
        website,
        domains,
        countries,
        isIntegrated,
        isRedirectAvailable,
        isCapsAvailable,
        callCenterFrom,
        callCenterTo,
        landingGroups,
        sendDataType,
        defaultSendData,
        endpointSendLead,
        apiParameters
    } = { ...req.body };

    const advertiserId = req.params.id;
    if (!name) return handler.errorMessage(res, 'Advertiser name cannot be empty!');
    if (countries.length === 0) return handler.errorMessage(res, 'Advertiser countries cannot be empty!');
    if (!callCenterFrom) return handler.errorMessage(res, 'callCenterFrom name cannot be empty!');
    if (!callCenterTo) return handler.errorMessage(res, 'callCenterTo name cannot be empty!');
    if (!sendDataType) return handler.errorMessage(res, 'sendDataType cannot be empty!');
    if (!endpointSendLead) return handler.errorMessage(res, 'endpointSendLead cannot be empty!');

    try {
        await Advertiser.updateOne(
            {
                _id: advertiserId
            },
            {
                name: name,
                description: description,
                website: website,
                landingGroups: landingGroups,
                domains: domains,
                countries: countries,
                isIntegrated: isIntegrated,
                isRedirectAvailable: isRedirectAvailable,
                isCapsAvailable: isCapsAvailable,
                callCenterWork: `${callCenterFrom}-${callCenterTo}`,
                sendDataType,
                defaultSendData,
                endpointSendLead,
                apiParameters
            }
        );

        const offerAdvertisers = await Offer.aggregate([
            {
                $project: {
                    advertisers: {
                        $filter: {
                            input: '$advertisers',
                            as: 'advertiser',
                            cond: { $eq: ['$$advertiser.id', mongoose.Types.ObjectId(advertiserId)]},
                        }
                    }
                }
            }, 
            {
                $project: {
                    advertisers: 1,
                    sizeOfMatched: {$size: "$advertisers"}
                }
            }, 
            {
                $match: {"sizeOfMatched": { $eq: 1 }}
            }
        ]);

        for (const offerAdvertiser of offerAdvertisers) {
            const landigGroupsFormat = [];
            const offerId = offerAdvertiser._id;
            // const advertiserId = offerAdvertiser.advertisers[0].id;
            // const advertiserCaps = offerAdvertiser.advertisers[0].caps;
            const advertiserLandingGroups = offerAdvertiser.advertisers[0].landingGroups;

            landingGroups.map(group => {
                if(!advertiserLandingGroups.some(currentGroup => currentGroup.name === group)) {
                    landigGroupsFormat.push({
                        name: group,
                        set: 0,
                        current: 0,
                        isActive: false
                    });
                } else {
                    const filteredCurrent = advertiserLandingGroups.filter(groupData => groupData.name === group);
                    landigGroupsFormat.push({
                        name: group,
                        set: filteredCurrent[0].set,
                        current: filteredCurrent[0].current,
                        isActive: filteredCurrent[0].isActive
                    });
                    
                }
            });
            
            await Offer.updateOne(
                {
                    _id: offerId,
                    advertisers: { $elemMatch: { id: advertiserId } }
                },{
                    "advertisers.$.name": name,
                    "advertisers.$.landingGroups": landigGroupsFormat,
                    "advertisers.$.domains": domains,
                    "advertisers.$.countries": countries,
                    "advertisers.$.callCenterWork": `${callCenterFrom}-${callCenterTo}`,
                    "advertisers.$.isRedirectAvailable": isRedirectAvailable,
                    "advertisers.$.isCapsAvailable": isCapsAvailable
                });
        }
        
        await handler.pResponse(res, {
            message: `Advertiser updated`,
        }, req);

    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.deleteAdvertiser = async (req, res) => {
    const advertiserId = req.params.id;

    try {
        const deleteResult = await Advertiser.deleteOne( { "_id": advertiserId } );
        if (deleteResult.deletedCount === 0) throw new Error(`Can't delete advertiser`);
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    return handler.pResponse(res, {
        message: `Advertiser deleted`
    }, req);
};
