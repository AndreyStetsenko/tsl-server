const axios = require('axios');
const FormData = require('form-data');

const leadHelpers = require('../../../helpers/lead');
const advertiserHelpers = require('../../../helpers/advertisers');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject && errorObject.msg) {
        errorArray.push(errorObject.error);
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

    const affiliateId = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'affiliateId');

    const formData = new FormData();

    const requestData = {
        affiliate_id: affiliateId,

        firstname: lead.firstName,
        lastname: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        country: lead.country,
        source: lead.landingGroup,
        domain: sendData.result,
        ip: lead.ip,
    };

    for (var key in requestData) {
        formData.append(key, requestData[key]);
    }

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        data: formData,
        headers: formData.getHeaders()
    };
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data.status == 200) {
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