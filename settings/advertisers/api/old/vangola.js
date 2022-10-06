const axios = require('axios');
// const { GoogleSpreadsheet } = require('google-spreadsheet');
// const moment = require('moment');
// const queryString = require('query-string');

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

    const requestOptions = {
        first_name: lead.firstName,
        last_name: lead.lastName,
        campaign: 'RU',
        email: lead.email,
        phone: lead.phone,
        landing: sendData.result,
        country: lead.country,
        vertical: 'Forex',
        page: lead.landingGroupName,
        source: 'NickWeb',
        ip: lead.ip
    };

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        data: requestOptions,
    };
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 201 && response.data.Status == 'Success') {
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