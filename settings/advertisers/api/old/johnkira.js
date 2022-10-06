const axios = require('axios');
const _ = require('lodash');

const leadHelpers = require('../../../../helpers/lead');
const advertiserHelpers = require('../../../../helpers/advertisers');
const miscHelpers = require('../../../../helpers/misc');

const Advertiser = require('../../../../models/Advertisers');
const LeadSendLog = require('../../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject && errorObject.message) {
        errorArray.push(errorObject.message);
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

    const country = miscHelpers.getCountryDetails(lead.country);

    const authorization = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'authorization');

    const requestData = {
        firstname: lead.firstName,
        lastname: lead.lastName,
        fullname: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        phone: lead.phone,
        country: country.name,

        utm_campaign: sendData.result,
        comment: "",
        info: ""
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        data: {
            leads: [
                requestData
            ]
        },
        headers: {
            "Authorization": authorization
        }
    };
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (_.get(response, 'data.data.validCnt') == 1) {
            response.sendStatus = true;
            response.partnerRedirectUrl = _.get(response, 'data.data.valid[0].login_url', '');
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