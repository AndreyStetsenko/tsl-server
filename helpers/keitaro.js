const queryString = require('query-string');
const axios = require('axios');

const KEITARO_SERVER = 'https://tsl-keitaro.site/'

exports.sendPostback = async (trackerId, leadStatus) => {
    const postbackUrl = 'cbea7d5/postback';

    const response = {
        sendStatus: false
    };

    const requestData = {
        subid: trackerId,
        status: leadStatus,
    };
    const stringifiedData = queryString.stringify(requestData);
    const options = {
        url: `${KEITARO_SERVER}${postbackUrl}`,
        method: 'POST',
        data: stringifiedData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data === 'Success' && response.status === 200) {
            response.sendStatus = true;
        }

        return response;
    } catch(error) {
        if (error.isAxiosError) {
            response.status = error.response.status;
            response.data = error.response.data;

            return response;
        } else {
            throw error;
        }
    }
}