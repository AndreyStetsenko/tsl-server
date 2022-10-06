
const { logger } = require('../logger');
const telegram = require('../utils/telgramBot');

module.exports = {
  handleDevErrors: async (error, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const response = isProduction ? 'Something went wrong. Please contact support.' : error.message;
    
    if(isProduction) {
      telegram.sendMessage(`Server error: ${error.message}`, 'dev')
    }
    
    logger.error(error);
    return res.status(223).json({ status: false, data: { message: response } });
  },
  /* this is for handling 404 error */
  handle404Error: async (req, res) => {
    res.status(404).json({ status: false, code: 404, message: 'Please check URL' });
  },
  /* centralizing all the errors */
  handleExceptions: fn =>
    (req, res, next) => {
      fn(req, res)
        .catch((error) => {
          next(error);
        });
    },
};