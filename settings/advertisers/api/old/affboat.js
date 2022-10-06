const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');
const advertiserHelpers = require('../../../helpers/advertisers');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

const defaultPassword = 'jaDhsfhg6sF$';

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

    const apiKeyParameter = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'apiKey');
    const linkIdParameter = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'linkId');


    const requestData = {
        password: defaultPassword,
        link_id: linkIdParameter,

        fname: lead.firstName,
        lname: lead.lastName,
        email: lead.email,
        fullphone: lead.phone,
        ip: lead.ip ? lead.ip : miscHelpers.randomIpGenerator(),
        source: lead.landingGroupName,
        domain: sendData.result,
        description: '',

        click_id: lead._id ? lead._id : lead.id,
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: `${advertiser.endpointSendLead}?api_token=${apiKeyParameter}`,
        method: 'POST',
        data: requestData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200 && response.data.success) {
            response.sendStatus = true;
            response.partnerRedirectUrl = response.data.autologin;
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