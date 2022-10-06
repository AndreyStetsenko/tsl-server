/* we will be centralizing all the responses at one place */
const { logger } = require('../logger');

module.exports = {
  /* for all the positive response */
  pResponse: async (res, data, req) => {
    res.status(200).json({ status: true, data });
  },
    /* for all positve responses with file */
  pResponseFile: async (res, filePath, fileName, req) => {
    res.status(200).download(filePath, fileName);
  },
  /* when something goes wrong */
  nResponse: async (res, message, code) => {
    res.status(222).json({ status: false, message, code });
  },
  /* for redirect */
  pRedirect: async (res, url) => {
    res.redirect(url);
  },
  /* when we want send manual error messages */
  errorMessage: async (res, error) => {
    logger.error(error);
    res.status(200).json({ status: false, data: { message: error } });
  }
};

