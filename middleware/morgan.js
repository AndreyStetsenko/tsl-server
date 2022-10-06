const morgan = require('morgan');
const { logger } = require('../logger');

const stream = {
  // Use the http severity
  write: (message) => logger.http(message.trim()),
};

const skip = () => {
    // const env = process.env.NODE_ENV || "development";
    // return env !== "development";
    return false;
  };

const morganMiddleware = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

module.exports = { morganMiddleware };