const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');
const miscHelpers = require('../helpers/misc');

const Role = require('../models/Roles');

exports.addRole = async (req, res) => {
    const userId = req.userData.userId;
    const { name, slug, permissions } = { ...req.body };

    if (!name) return handler.errorMessage(res, 'Flow name cannot be empty!');
    if (!slug) return handler.errorMessage(res, 'Flow offerId cannot be empty!');

    const role = new Role({
        name,
        slug,
        permissions,
        creator: userId
    });

    try {
        await role.save();

        await handler.pResponse(res, {
            message: 'Role added',
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.getRoles = async (req, res) => {
    const query = Role.find({ slug: { $ne: 'admin' } });

    try {
        const roles = await query;
        const total = roles.length;
        
        await handler.pResponse(res, {
            message: 'Roles list',
            roles,
            total
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};