const axios = require('axios');
const _ = require('lodash');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');
const advertiserHelpers = require('../../../helpers/advertisers');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject.error) {
        errorArray.push(errorObject.error);
    } else if (errorObject.message) {
        errorArray.push(errorObject.message);
    }

    if (errorArray.length > 0) {
        return errorArray.join(',');
    } else {
        return '';
    }
}

exports.sendLead = async (lead, advertiserId, testLead = false) => {
    const leadId = lead.id ? lead.id : lead._id;

    const response = {
        sendStatus: false
    };

    const advertiser = await Advertiser.findOne({
        _id: advertiserId
    });

    const sendData = await leadHelpers.getSendDataTypeValue(advertiser.sendDataType, lead, advertiserId);
    if(!sendData.status) {
        response.formattedError = sendData.message;
        return response;
    };

    const apiUsernameParameter = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'user');
    const apiPasswordParameter = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'password');
    const funnelParameter = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'funnel');


    const requestData = {
        task: 'external_api',

        api_username: apiUsernameParameter,
        api_password: apiPasswordParameter,
        key_sales_funnels: funnelParameter,

        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        landing: sendData.result
    };

    if(testLead) {
        response.requestData = requestData;
    }

    // const stringifiedData = queryString.stringify(requestData, {sort: false});

    const options = {
        url: `${advertiser.endpointSendLead}`,
        method: 'POST',
        params: requestData
        // data: stringifiedData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;
        console.log(response)

        if (_.get(response, 'data.success') == 1) {
            response.sendStatus = true;
        } else {
            response.formattedError = formatError(response.data);
        }

        const log = new LeadSendLog({
            leadId: leadId,
            status: response.status,
            data: response.data,
        });
        await log.save();

        return response;
    } catch(error) {
        const parseError = miscHelpers.parseRequestError(error, response);
        
        const log = new LeadSendLog({
            leadId: leadId,
            status: parseError.status,
            data: parseError.data,
            errorType: parseError.errorType,
            errorMessage: parseError.errorMessage
        });
        await log.save();

        return parseError;
    }
}