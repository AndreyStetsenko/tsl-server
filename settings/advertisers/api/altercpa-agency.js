const axios = require('axios');
const queryString = require('query-string');
const moment = require('moment');
const _ = require('lodash');

const miscHelpers = require('../../../helpers/misc');
const leadHelpers = require('../../../helpers/lead');
const advertiserHelpers = require('../../../helpers/advertisers');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');
const Lead = require('../../../models/Leads');

const offers = [
    { groupName: 'TEST GROUP 1', offerId: 121 },
];

function getOfferId(landingGroup) {
    const offer = offers.filter(offer => { 
        return landingGroup.trim().toUpperCase().includes(offer.groupName);
    });

    if(offer.length > 0) {
        return offer[0].offerId;;
    } else {
        return offers[0].offerId;
    }
}

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject && errorObject.error) {
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

    const apiToken = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'apiToken');

    const requestData = {
        offer: getOfferId(lead.landingGroup),

        name: lead.firstName,
        last: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        ip: lead.ip ? lead.ip : miscHelpers.randomIpGenerator(),
        country: lead.country,
    };

    const options = {
        url: `${advertiser.endpointSendLead}?id=${apiToken}`,
        method: 'POST',
        data: requestData
    };

    if(testLead) {
        response.requestData = options;
    }
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data.status === "ok") {
            response.sendStatus = true;

            await Lead.updateOne({ _id: leadId }, { advertiserLeadId: response.data.id });
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