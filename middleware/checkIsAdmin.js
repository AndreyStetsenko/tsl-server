const { logger } = require('../logger/index');

module.exports = async (req, res, next) => {
    try {
        if (!req.userData.role) throw new Error('No role parameter!');

        const role = req.userData.role;
        if (role !== 'admin') throw new Error('Only admin is able to run this request!');

        next();
    } catch (error) {
        logger.error('', error);
        res.status(401).json({
            message: 'Wrong permissions!'
        });
    }
};