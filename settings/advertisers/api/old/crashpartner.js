const queryString = require('query-string');
const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

// const Lead = require('../../../models/Leads');
const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject.error) {
        errorArray.push(errorObject.error);
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

    const token = advertiser.apiParameters.filter(param => param.name === 'token');

    const requestData = {
        token: token[0].value,

        first_name: lead.firstName, // FirstName
        last_name: lead.lastName, // LastName
        email: lead.email, // email
        phone: lead.phone, // phone
        utm_source: sendData.result,
        utm_medium: 'medium',
        utm_campaing: 'campaign',
        utm_content: 'contnent'
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: advertiser.endpointSendLead,
        data: requestData,
        method: 'POST',
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data.user_id && response.status === 201) {
            // if(leadId) {
            //     await Lead.updateOne(
            //         { _id: leadId },
            //         { sendBody: requestData }
            //     )
            // } 
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