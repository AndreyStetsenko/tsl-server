const axios = require('axios');
const moment = require('moment');
const queryString = require('query-string');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject && errorObject.message) {
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

    const apiKeyParameter = advertiser.apiParameters.filter(param => param.name === 'apiKey');
    const managerId = advertiser.apiParameters.filter(param => param.name === 'managerId');
    const statusId = advertiser.apiParameters.filter(param => param.name === 'statusId');

    const requestData = {
        manager_id: managerId[0].value,
        status_id: statusId[0].value,

        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        source_lid: `${sendData.result.toUpperCase()}_${moment().tz(process.env.TIMEZONE).format('MM_YYYY')}`
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const stringified = queryString.stringify(requestData);
    const options = {
        url: `${advertiser.endpointSendLead}${apiKeyParameter[0].value}`,
        method: 'POST',
        data: stringified,
    };
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200 && response.data.success == 1) {
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