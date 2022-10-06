const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');
const miscHelpers = require('../helpers/misc');

const Offer = require('../models/Offers');
const Flow = require('../models/Flows');

exports.getFlows = async (req, res) => {
    const userId = req.userData.userId;
    const pageSize = +req.query.pageSize;
    const currentPage = +req.query.page;
    const showActive = req.query.showActive === 'true' ? true : false;

    const query = Flow.find({ creator: userId, isActive: showActive });
    if (pageSize && currentPage) {
        query
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize)
            .sort({createdAt: -1})
    }

    try {
        const flows = await query;
        const total = await Flow.count({ creator: userId, isActive: showActive });
        
        await handler.pResponse(res, {
            message: 'Flows list',
            flows: flows,
            total: total
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.getFlow = async (req, res) => {
    const userId = req.userData.userId;

    const flowId = req.params.id;
    if (!flowId) return handler.errorMessage(res, `No 'id' parameter value.`);

    let flow;
    try {
        flow = await Flow.findOne({
            _id: offerrId,
            creator: userId
        });
        if (!flow) return handler.errorMessage(res, 'Flow not found.');
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    handler.pResponse(res, {
        message: 'Flow finned',
        flow: flow
    }, req);
}

exports.addFlow = async (req, res) => {
    const userId = req.userData.userId;
    const { name, offer } = { ...req.body };

    if (!name) return handler.errorMessage(res, 'Flow name cannot be empty!');
    if (!offer) return handler.errorMessage(res, 'Flow offerId cannot be empty!');
    if (!offer.id.match(/^[0-9a-fA-F]{24}$/)) return handler.errorMessage(res, `Bad offer id!`);
    const checkOffer = await Offer.findOne({ _id: offer.id });
    if (!checkOffer) return handler.errorMessage(res, `Can't find offer id!`);

    const externalId = miscHelpers.generateFlowId();

    const flow = new Flow({
        externalId: externalId,
        name: name,
        offer: offer,
        creator: userId
    });

    try {
        await flow.save();

        await handler.pResponse(res, {
            message: 'Flow added',
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.deleteFlow = async (req, res) => {
    const userId = req.userData.userId;
    const flowId = req.params.id;

    try {
        const deleteResult = await Flow.deleteOne({
            _id: flowId,
            creator: userId
        });
        if (deleteResult.deletedCount === 0) throw new Error(`Can't delete offer`);
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    handler.pResponse(res, {
        message: `Flow deleted`
    }, req);
};


exports.updateFlowOwner = async (req, res) => {

    const { creatorOld, creatorNew } = { ...req.body };
    
    let updateStatus;
    try {
        updateStatus = await Flow.updateMany({"creator": creatorOld}, {"$set":{"creator": creatorNew}});
    } catch (error) {
        logger.error('', error);
        handler.errorMessage(res, error);
    }
    
    await handler.pResponse(res, {
        message: `Lead updated`,
        // updateStatus: updateStatus
    }, req);
};

exports.getFlowsByAffiliate = async (req, res) => {
    const userId = req.params.id;
    if (!userId) return handler.errorMessage(res, 'User id parameter is empty!');

    let affiliateFlows;
    try {
        affiliateFlows = await Flow.find({ creator: userId }, { name: 1, offer: 1 });
    } catch (error) {
        logger.error('', error);
        throw error;
    }

    await handler.pResponse(res, {
        message: `Affiliate flows`,
        affiliateFlows: affiliateFlows
    }, req);
};

exports.getAffiliateFlows = async (req, res) => {
    const userId = req.userData.userId;

    try {
        const affiliateFlows = await Flow.find({ creator: userId }, { name: 1 });

        await handler.pResponse(res, {
            message: `Affiliate flows`,
            affiliateFlows: affiliateFlows
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.disableFlow = async (req, res) => {
    const flowId = req.params.id;
    const userId = req.userData.userId;

    if (!flowId) return handler.errorMessage(res, 'Flow id parameter is empty!');

    try {
        const result = await Flow.update(
            {
                _id: flowId,
                creator: userId
            }, {
                isActive: false
            }
        );

        await handler.pResponse(res, {
            message: 'Flow disabled',
            result: result.nModified === 1 ? true : false
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};
