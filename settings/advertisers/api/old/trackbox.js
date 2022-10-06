const axios = require('axios');

const miscHelpers = require('../../../helpers/misc');
const leadHelpers = require('../../../helpers/lead');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

const defaultPassword = 'sdWdkajdywb*e1&';

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject.data) {
        if(Array.isArray(errorObject.data)) {
            errorObject.data.map(error => {
                errorArray.push(error.message)
            })
        }
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

    const login = advertiser.apiParameters.filter(param => param.name === 'login');
    const password = advertiser.apiParameters.filter(param => param.name === 'password');
    const apiKey = advertiser.apiParameters.filter(param => param.name === 'apiKey');
    const ai = advertiser.apiParameters.filter(param => param.name === 'ai');
    const ci = advertiser.apiParameters.filter(param => param.name === 'ci');
    const gi = advertiser.apiParameters.filter(param => param.name === 'gi');

    const requestData = {
        password: defaultPassword,

        ai: ai[0].value,
        ci: ci[0].value,
        gi: gi[0].value,

        firstname: lead.firstName,
        lastname: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        userip: lead.ip ? lead.ip : miscHelpers.randomIpGenerator(),
        so: sendData.result
    };

    const options = {
        url: advertiser.endpointSendLead,
        headers: {
            'x-trackbox-username': login[0].value ,
            'x-trackbox-password': password[0].value, 
            'x-api-key': apiKey[0].value,
            'Content-Type': 'application/json'
        },
        method: 'POST',
        data: requestData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200 && response.data.status) {
            response.sendStatus = true;
            // response.partnerRedirectUrl = response.data.data.autologin_url;
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