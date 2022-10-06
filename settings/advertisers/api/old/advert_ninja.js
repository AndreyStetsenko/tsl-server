const axios = require('axios');

const miscHelpers = require('../../../helpers/misc');
const leadHelpers = require('../../../helpers/lead');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject.comments) {
        errorArray.push(errorObject.comments);
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
    const campaignIdParameter = advertiser.apiParameters.filter(param => param.name === 'campaignId');


    const requestData = {
        campaign_id: campaignIdParameter[0].value,

        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        country: lead.country,
        landingLanguage: lead.language,
        landing: sendData.result
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: advertiser.endpointSendLead,
        headers: {
            'Authorization': 'Bearer ' + apiKeyParameter[0].value
        },
        method: 'POST',
        data: requestData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data.success && response.data.leadId && response.data.lead_status === 'VALID') {
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