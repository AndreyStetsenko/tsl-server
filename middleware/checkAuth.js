const { verifyToken } = require('../utils/tokenHelper');
const { logger } = require('../logger/index');

module.exports = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      throw new Error('No authorization header.')
    }
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = await verifyToken(token);
    req.userData = {
      login: decodedToken.login,
      userId: decodedToken.userId,
      role: decodedToken.role,
      dashboardName: decodedToken.dashboardName
    };
    next();
  } catch(error) {
    logger.error(error.message);
    res.status(401).json({
      status: false, message: 'You are not authenticated!'
    });
  }
};
