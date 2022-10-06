const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');

const Offer = require('../models/Offers');

exports.getOffers = async (req, res) => {
    let offers;
    let total;
    try {
        offers = await Offer.find({});
        total = await Offer.find({}).count();
    } catch (error) {
        logger.error('', error);
    }
    handler.pResponse(res, {
        message: 'Offers list',
        offers: offers,
        total: total
    }, req);
};

exports.getFinanceOffers = async (req, res) => {
    try {
        const offers = await Offer.find({
            'categories.id': 'finance'
        });
        const total = await Offer.find({'categories.id': 'finance'}).count();

        await handler.pResponse(res, {
            message: 'Offers list',
            offers: offers,
            total: total
        }, req);
    } catch (error) {
        logger.error('', error);
    }
};

exports.getOffer = async (req, res) => {
    const offerrId = req.params.id;
    if (!offerrId) return handler.errorMessage(res, `No 'id' parameter value.`);

    let offer;
    try {
        offer = await Offer.findOne({
            _id: offerrId
        });
        if (!offer) return handler.errorMessage(res, 'Offer not found.');
    } catch (error) {
        throw error;
    }

    handler.pResponse(res, {
        offer: offer
    }, req);
}

exports.addOffer = async (req, res) => {
    const { name, externalId, description, url, advertisers, categories, isMultiGeoActive, geoDetails } = { ...req.body };

    if (!name) return handler.errorMessage(res, 'Offer name cannot be empty!');
    if (advertisers.length === 0) return handler.errorMessage(res, 'Offer advertisers cannot be empty!');
    if (categories.length === 0) return handler.errorMessage(res, 'Offer categories cannot be empty!');

    advertisers.map(advertiser => {
        const updatedLandingGroups = [];
        advertiser.landingGroups.map(landingGroup => {
            updatedLandingGroups.push({
                set: 0,
                current: 0,
                name: landingGroup
            });
        });
        advertiser.landingGroups = updatedLandingGroups;
    });

    const offer = new Offer({
        name: name,
        externalId: externalId,
        description: description,
        url: url,
        advertisers: advertisers,
        categories: categories,
        isMultiGeoActive,
        geoDetails
    });

    await offer.save();

    return handler.pResponse(res, {
        message: 'Offer added.'
    }, req);
};

exports.updateOffer = async (req, res) => {
    const offerId = req.params.id;
    const { name, externalId, description, url, advertisers, categories, isMultiGeoActive, geoDetails } = { ...req.body };
    if (!name) return handler.errorMessage(res, 'Offer name cannot be empty!');
    // if (advertisers.length === 0) return handler.errorMessage(res, 'Offer advertisers cannot be empty!');
    if (categories.length === 0) return handler.errorMessage(res, 'Offer categories cannot be empty!');

    advertisers.map(advertiser => {
        const updatedLandingGroups = [];
        advertiser.landingGroups.map(landingGroup => {
            updatedLandingGroups.push({
                set: 0,
                current: 0,
                name: landingGroup
            });
        });
        advertiser.landingGroups = updatedLandingGroups;
    });

    await Offer.updateOne(
        {
            _id: offerId
        },
        {
            name: name,
            externalId: externalId,
            description: description,
            url: url,
            advertisers: advertisers.length !== 0 ? advertisers : [],
            categories: categories,
            isMultiGeoActive,
            geoDetails
        }
    );

    return handler.pResponse(res, {
        message: `Offer updated`
    }, req);
};

exports.deleteOffer = async (req, res) => {
    const offerId = req.params.id;

    try {
        const deleteResult = await Offer.deleteOne( { "_id": offerId } );
        if (deleteResult.deletedCount === 0) throw new Error(`Can't delete offer`);
    } catch (error) {
        logger.error('', error);
    }

    handler.pResponse(res, {
        message: `Offer deleted`
    }, req);
};

exports.updateOfferCaps = async (req, res) => {
    const { capValues } = { ...req.body };
  
    if (capValues.length === 0) return handler.errorMessage(res, 'Offer caps cannot be empty!');

    capValues.map(async (cap) => {
        try {
            await Offer.updateOne(
                {
                    _id: cap.offerId,
                    advertisers: {$elemMatch: { id: cap.advertiserId}}
                }, {
                    $set: {
                        "advertisers.$.caps.set": cap.set,
                    }
                });
        } catch (error) {
            logger.error('', error);
        }
    });

    await handler.pResponse(res, {
        message: `Offer updated`
    }, req);
};


exports.updateOfferCapsByOffer = async (req, res) => {
    const { offerId, advertisersCaps } = { ...req.body };
    if (advertisersCaps.length === 0) return handler.errorMessage(res, 'Offer caps cannot be empty!');

    try {
        for(const advertisersCap of advertisersCaps) {
            await Offer.updateOne(
                {
                    _id: offerId,
                }, {
                    $set: {
                        "advertisers.$[advertiser].caps.set": advertisersCap.set,
                    }
                }, {
                    arrayFilters: [
                        { "advertiser.id": advertisersCap.advertiserId },
                    ]
            });

            for(const landigGroupCap of advertisersCap.landingGroupsCap) {
                await Offer.updateOne(
                    {
                        _id: offerId,
                    }, {
                        $set: {
                            "advertisers.$[advertiser].landingGroups.$[group].set": landigGroupCap.set,
                        }
                    }, {
                        arrayFilters: [
                            { "advertiser.id": advertisersCap.advertiserId },
                            { "group.name": landigGroupCap.name }
                        ]
                    }
                );
            }
        }
        // advertisersCaps.map(async (advertisersCap) => {
        //     try {
        //         await Offer.updateOne(
        //             {
        //                 _id: offerId,
        //                 // advertisers: {$elemMatch: { id: cap.advertiserId}}
        //             }, {
        //                 $set: {
        //                     "advertisers.$[advertiser].caps.set": cap.newCap,
        //                 }
        //             }, {
        //                 arrayFilters: [
        //                     { "advertiser.id": advertisersCap.advertiserId },
        //                     // { "group.name": 'ton' },
        //                 ]
        //             });
        //     } catch (error) {
        //         console.log(2)
        //     } 
            
        //     advertisersCap.landingGroupsCap.map(async (landingGroupCap) => {
        //         console.log(`Advertiser: ${advertisersCap}`)
        //         console.log(`Landing group cap: ${landingGroupCap}`)
        //     })
            // try {
            //     await Offer.updateOne(
            //         {
            //             _id: offerId,
            //             advertisers: {$elemMatch: { id: cap.advertiserId}}
            //         }, {
            //             $set: {
            //                 "advertisers.$.caps.set": cap.newCap,
            //             }
            //         });
            // } catch (error) {
            //     logger.error('', error);
            // }
        // });
    } catch(error) {
        // console.log(error.message)
        return await handler.errorMessage(res, error.message);
    }
    // advertisersCaps.map(async (advertisersCap) => {
    //     advertisersCap.landingGroupsCap.map(async (landingGroupCap) => {
    //         console.log(`Advertiser: ${advertisersCap}`)
    //         console.log(`Landing group cap: ${landingGroupCap}`)
    //     })
    //     // try {
    //     //     await Offer.updateOne(
    //     //         {
    //     //             _id: offerId,
    //     //             advertisers: {$elemMatch: { id: cap.advertiserId}}
    //     //         }, {
    //     //             $set: {
    //     //                 "advertisers.$.caps.set": cap.newCap,
    //     //             }
    //     //         });
    //     // } catch (error) {
    //     //     logger.error('', error);
    //     // }
    // });

    await handler.pResponse(res, {
        message: `Offer updated`
    }, req);
};

exports.playPauseAdvertiserCap = async (req, res) => {
    const { offerId, advertiserId, isPaused } = { ...req.body };
    if (!offerId) return handler.errorMessage(res, 'offerId cannot be empty!');
    if (!advertiserId) return handler.errorMessage(res, 'advertiserId cannot be empty!');

    try {
        await Offer.updateOne(
            {
                _id: offerId,
                advertisers: {$elemMatch: { id: advertiserId}}
            }, {
                $set: {
                    "advertisers.$.isPaused": isPaused,
                }

            });
    } catch (error) {
        logger.error('', error);
    }

    await handler.pResponse(res, {
        message: `Advertiser ${isPaused ? 'stop' : 'play'}`
    }, req);
};


exports.playPauseGroupAdvertiserCap = async (req, res) => {
    const { offerId, advertiserId, groupName, isActive } = { ...req.body };
    if (!offerId) return handler.errorMessage(res, 'offerId cannot be empty!');
    if (!advertiserId) return handler.errorMessage(res, 'advertiserId cannot be empty!');
    if (!groupName) return handler.errorMessage(res, 'groupName cannot be empty!');

    try {
        const update = await Offer.updateOne(
            {
                _id: offerId,
            }, {
                $set: {
                    "advertisers.$[advertiser].landingGroups.$[group].isActive": isActive,
                }
            }, {
                arrayFilters: [
                    { "advertiser.id": advertiserId },
                    { "group.name": groupName }
                ]
            }
        );

        await handler.pResponse(res, {
            message: `Оффер ${offerId}, рекламодатель ${advertiserId},группа ${groupName}`,
            isActive: !isActive,
            update
        }, req);
    } catch (error) {
        logger.error('', error);
    }
};