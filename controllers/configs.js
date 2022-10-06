const handler = require('../utils/responseHandler');
const { logger } = require('../logger/index');
const _ = require('lodash');

const Config = require('../models/Config');

exports.getAll = async (req, res) => {
};

exports.get = async (req, res) => {
}

exports.add = async (req, res) => {
    const { entity, values } = { ...req.body };
    if (!entity) return handler.errorMessage(res, 'Setting entity cannot be empty!');
    if (values.length === 0) return handler.errorMessage(res, 'Config settings cannot be empty!');

    const config = new Config({ entity, values });

    try {
        await config.save();

        await handler.pResponse(res, {
            message: 'Config added.'
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.update = async (req, res) => {
};

exports.delete = async (req, res) => {
};