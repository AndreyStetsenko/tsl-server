const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const advertiserHelpers = require('../../../helpers/advertisers');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

const flows = [
    // { groupName: 'TON', offerId: null, flowId: null },
    // { groupName: 'GRAM', offerId: null, flowId: null },
    { groupName: 'GAZ', flowName: 'gazprom' },
    // { groupName: 'TESLA', offerId: null, flowId: null },
    // { groupName: 'YANDEX', offerId: null, flowId: null }
];


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

    const flowDetails = getPartnerFlow(lead.landingGroup);

    const advertiser = await Advertiser.findOne({
        _id: advertiserId
    });

    const sendData = await leadHelpers.getSendDataTypeValue(advertiser.sendDataType, lead, advertiserId);
    if(!sendData.status) {
        response.formattedError = sendData.message;
        return response;
    };

    const pass = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'pass');
    const owner = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'owner');

    const requestData = {
        pass: pass,
        owner: owner,

        name: lead.firstName,
        second_name: lead.lastName,
        email: lead.email,
        phone: (lead.phone).replace('+', ''),
        ip: lead.ip,
        country: (lead.country).toUpperCase(),
        lang: (lead.language).toUpperCase(),
        group: flowDetails.flowName,
        host: flowDetails.flowName,
        cpl: false,
        http_referer_term: "MX"
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const options = {
        url: advertiser.endpointSendLead,
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