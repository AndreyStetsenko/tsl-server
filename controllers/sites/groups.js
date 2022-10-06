const handler = require('../../utils/responseHandler');
const { logger } = require('../../logger/index');
const _ = require('lodash');
const moment = require('moment');

const dbHelpers = require('../../helpers/db-helpers');

const SiteGroup = require('../../models/Site-Groups');

exports.getSubGroups = async (req, res) => {
    const {
        sortColumn,
        sortOrder,
        filter
    } = {...req.query}

    const pageSize = +req.query.pageSize;
    const currentPage = +req.query.currentPage;

    const sortingMap = {
        asc: 1,
        desc: -1
    };
    const sort = sortOrder ? { [sortColumn]: sortingMap[sortOrder] } : {};

    const query = SiteGroup.find({ type: filter });
    if (pageSize && currentPage) {
        query
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize)
            .sort(sort)
    };

    try {
        const groups = await query;
        const total = await SiteGroup.find({ type: filter }).countDocuments();

        await handler.pResponse(res, {
            message: 'Group list',
            groups: groups,
            total: total,
        }, req);
    } catch (error) {
        await handler.errorMessage(res, error.message);
    }
};

exports.getUniqueLandingGroups = async (req, res) => {
    try {
        const uniqueGroups = await SiteGroup.distinct('groupName', {
            type: 'landings'
        });

        const sorted = _.orderBy(uniqueGroups);

        await handler.pResponse(res, {
            message: 'Group list',
            uniqueGroups: sorted
        }, req);
    } catch(error) {

    }
};

exports.getUniqueLandingSubroups = async (req, res) => {
    try {
        const uniqueGroups = await SiteGroup.distinct('subgroupName', {
            type: 'landings'
        });

        const sorted = _.orderBy(uniqueGroups);

        await handler.pResponse(res, {
            message: 'Group list',
            uniqueGroups: sorted
        }, req);
    } catch(error) {

    }
};

exports.addGroup = async (req, res) => {
    const userId = req.userData.userId;
    const { groupName, subgroupName, plug, aPlug, type } = { ...req.body };

    if (!groupName) return handler.errorMessage(res, `No 'groupName' parameter value.`);
    if (!subgroupName) return handler.errorMessage(res, `No 'subgroupName' parameter value.`);
    if (!plug) return handler.errorMessage(res, `No 'plug' parameter value.`);
    if (type !== 'landings' && type !== 'prelandings') return handler.errorMessage(res, `'type' valid values are landings|prelandings`);
  
    const checkGroup = await SiteGroup.findOne({
        groupName: groupName.toString().toLowerCase(),
        subgroupName: subgroupName.toString().toLowerCase()
    });
    if (checkGroup) return handler.errorMessage(res, 'Group with Subgroup already exist.');

    const group = new SiteGroup({
        groupName,
        subgroupName,
        plug,
        aPlug,
        type,
        creator: userId,
    });

    try {
        await group.save();

        await handler.pResponse(res, {
            message: 'Group added.'
        }, req);
    } catch (error) {
        await handler.errorMessage(res, error.message);
    }
};

exports.updateGroup = async (req, res) => {
    const { id } = { ...req.params };
    const { groupName, subgroupName, plug, aPlug, type } = { ...req.body };

    try {
        const result = await SiteGroup.updateOne(
            {
                _id: id
            }, {
                groupName,
                subgroupName,
                plug,
                aPlug,
                type,
            }
        );

        await handler.pResponse(res, {
            message: 'Группа обновлена',
            result: result.nModified === 1 ? true : false
        }, req);
    } catch (error) {
        await handler.errorMessage(res, error.message);
    }
};


exports.deleteGroup = async (req, res) => {
    const { id } = { ...req.params };

    try {
        const result = await SiteGroup.deleteOne({ _id: id });

        await handler.pResponse(res, {
            message: 'Группа удалена',
            result: result.deletedCount === 1 ? true : false
        }, req);
    } catch (error) {
        await handler.errorMessage(res, error.message);
    }
};