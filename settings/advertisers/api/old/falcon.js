const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const advertiserHelpers = require('../../../helpers/advertisers');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject && errorObject.message) {
        errorArray.push(errorObject.message);
    }

    if (errorObject.fields) {
        for (const field in errorObject.fields) {
            if (errorObject.fields.hasOwnProperty(field)) {
                errorObject.fields[field].map(error => {
                    errorArray.push(error);
                })
            }
        }
    }

    if (errorArray.length > 0) {
        return errorArray.join(', ');
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

    const login = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'login');
    const password = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'password');
    const proxy = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'proxy');

    const PROXY_ENABLED = proxy === 'true' ? true : false;

    const requestData = {
        password: 'Grt5Oug12',
        currency: 'USD',

        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        country: lead.country,
        language: lead.language,
        source: sendData.result,
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        data: requestData,
        headers: {
            login: login,
            password: password
        },
        ...(PROXY_ENABLED && { httpsAgent: miscHelpers.getProxySettings() })
    };
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200) {
            response.sendStatus = true;
            response.partnerRedirectUrl = response.data.redirectUrl;
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