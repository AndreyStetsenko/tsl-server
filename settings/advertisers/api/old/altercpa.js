const axios = require('axios');
const moment = require('moment');
const queryString = require('query-string');

const leadHelpers = require('../../../../helpers/lead');
const advertiserHelpers = require('../../../../helpers/advertisers');
const miscHelpers = require('../../../../helpers/misc');

const Advertiser = require('../../../../models/Advertisers');
const LeadSendLog = require('../../../../models/Lead-Send-Logs');

const ENABLE_PROXY = false;

const flows = [
    // { groupName: 'TON', offerId: null, flowId: null },
    // { groupName: 'GRAM', offerId: null, flowId: null },
    { groupName: 'GAZ', offerId: 1, flowId: 23 },
    // { groupName: 'TESLA', offerId: null, flowId: null },
    // { groupName: 'YANDEX', offerId: null, flowId: null }
];


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

function getPartnerFlow(landingGroup) {
    const flow = flows.filter(flow => { 
        return landingGroup.trim().toUpperCase().includes(flow.groupName);
    });
    let filtered;

    if(flow.length > 0) {
        filtered = flow[0];
        return filtered;
    } else {
        return flows[0];
    }
}

exports.sendLead = async (lead, advertiserId, testLead = false) => {
    const leadId = lead.id ? lead.id : lead._id;

    const response = {
        sendStatus: false
    };

    const apiDetails = getPartnerFlow(lead.landingGroup);

    const advertiser = await Advertiser.findOne({
        _id: advertiserId
    });

    const sendData = await leadHelpers.getSendDataTypeValue(advertiser.sendDataType, lead, advertiserId);
    if(!sendData.status) {
        response.formattedError = sendData.message;
        return response;
    };

    const user = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'user');
    const key = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'key');

    const requestData = {
        flow: apiDetails.flowId,
        offer: apiDetails.offerId,

        name: lead.firstName,
        last: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        ip: lead.ip,
        country: lead.country,
        us: sendData.result,
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: `${advertiser.endpointSendLead}?id=${user}-${key}`,
        method: 'POST',
        data: requestData
    };
 
    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data.status === "ok") {
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