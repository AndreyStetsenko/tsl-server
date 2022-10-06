const { logger } = require('../logger/index');

const queryString = require('query-string');
const axios = require('axios');

const leadHelpers = require('./lead');

// await leadHelpers.logLeadDetails(leadId, userId, 13, {});

const User = require('../models/Users');

exports.affiliateSuccessPostback = async (affiliateId, lead) => {
    const leadId = lead.id ? lead.id : lead._id;
    lead.leadId = leadId;
    const response = {};

    try {
        const user = await User.findOne({
            _id: affiliateId
        });

        if (!user.postbacks.onSuccessSend) {
            return false;
        } else {
            const url = user.postbacks.settings.url;
            const dirtyParams = user.postbacks.settings.params;
            const splittedParams = dirtyParams.split('&');

            const paramsToObject = {};
            let paramsReady = true;

            for(const param of splittedParams) {
                const keyValue = param.split('=');
                const paramFirstChar = keyValue[1].charAt(0);
                const paramLastChar = keyValue[1].slice(-1);

                if(paramFirstChar == '{' && paramLastChar == '}') {
                    const cleanParameter = keyValue[1].replace('{', '').replace('}', '');
                    const updatedValue = lead[cleanParameter];

                    if(!updatedValue) {
                        await leadHelpers.logLeadDetails(leadId, affiliateId, 20, { urlParam: keyValue[1] });
                        paramsReady = false;
                        break;
                    } else {
                        paramsToObject[keyValue[0]] = updatedValue;
                    }
                } else {
                    paramsToObject[keyValue[0]] = keyValue[1];
                }
            }

            if(paramsReady) {
                const options = {
                    url: `${url}`,
                    method: 'POST',
                    params: paramsToObject
                };

                const result = await axios(options);
                response.status = result.status;
                response.data = result.data;

                if (response.status === 200 && response.data.length == 0) {
                    await leadHelpers.logLeadDetails(leadId, affiliateId, 22, { affiliate: user.dashboardName });
                    return true;
                } else {
                    await leadHelpers.logLeadDetails(leadId, affiliateId, 21, { status: response.status, data: response.data });
                    return false;
                }  
            } else {
                return false;
            }
        }
    } catch (error) {
        logger.error('', error);
        if (error.isAxiosError) {
            response.status = error.response ? error.response.status : 'null';
            response.data = error.response ? error.response.data : 'null';
            await leadHelpers.logLeadDetails(leadId, affiliateId, 21, { status: response.status, data: response.data });
            return false;
        }
    }
};