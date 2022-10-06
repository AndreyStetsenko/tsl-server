const axios = require('axios');

const miscHelpers = require('../../../helpers/misc');
const leadHelpers = require('../../../helpers/lead');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

const defaultPassword = 'sdfjb&WEBSS';

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

exports.sendLead = async (lead, advertiserId) => {
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

    const requestData = {
        password: defaultPassword,

        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        ip: lead.ip ? lead.ip : miscHelpers.randomIpGenerator(),
        country: lead.country,
        language: lead.language,
        utm_source: sendData.result
    };

    const options = {
        url: advertiser.endpointSendLead,
        headers: {
            "X-Api-Auth": apiKeyParameter[0].value
        },
        method: 'POST',
        data: requestData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200) {
            response.sendStatus = true;
            if(response.data.data) {
                response.partnerRedirectUrl = response.data.data.autologin_url;
            } 
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