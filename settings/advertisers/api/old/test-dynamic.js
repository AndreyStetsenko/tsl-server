const axios = require('axios');

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

    const requestData = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        landing: sendData.result,
        country: lead.country,
        ip: lead.ip
    };

    const sendDataObject = advertiser.apiParameters.filter(param => param.name === 'login').map(obj => obj.value);

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        data: requestData,
        headers: {
            login: sendDataObject[0]
        }
    };

    if(testLead) {
        response.requestData = requestData;
    }
 
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