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

// Parse request meesage to user friendly text messages
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

// Main method to send lead
exports.sendLead = async (lead, advertiserId, testLead = false) => {
    // Unify lead id from different intarfaces
    const leadId = lead.id ? lead.id : lead._id;
    // Default lead send status is false
    const response = {
        sendStatus: false
    };
    // Get advertiser details
    const advertiser = await Advertiser.findOne({
        _id: advertiserId
    });
    // Get send data type, from advertiser settings
    const sendData = await leadHelpers.getSendDataTypeValue(advertiser.sendDataType, lead, advertiserId);
    // Stop sending if no send data available in settings 
    if(!sendData.status) {
        response.formattedError = sendData.message;
        return response;
    };

    // Setion to get all dynamic parameters from advertiser API settings
    
    const parameter1 = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'parameter1');
    const parameter2 = advertiserHelpers.getApiParameter(advertiser.apiParameters, 'parameter2');
    // Reuqest body or url params to send
    const requestData = {
        password: parameter1,
        link_id: parameter2,
    
        // Lead parameters available: firstName, lastName, email, phone, ip, language, country, sub1 ... sub9
        fname: lead.firstName,
        lname: lead.lastName,
        email: lead.email,
        fullphone: lead.phone,
        ip: lead.ip ? lead.ip : miscHelpers.randomIpGenerator(), // If no ip from affiliate, try to randomize
        lang: lead.language,
        country: lead.country,

        source: sendData.result, // Get advertiser senda data type from settings

        click_id: leadId,
    };

    const options = {
        url: advertiser.endpointSendLead,   // Get API endpoint url from settings
        method: 'POST',                     // Type of request to send, in most cases GET or POST        
        data: requestData                   // Body of request or url parameters
    };

    if(testLead) {
        response.requestData = options;
    }

    try {
        const result = await axios(options); // Send request to advertiser API
        response.status = result.status; // Get request status
        response.data = result.data; // Get request data

        // Advertiser logic for accepting lead
        if (response.status === 200 && response.data.success) {
            response.sendStatus = true;
            // If redirect URL is available in advertiser
            response.partnerRedirectUrl = response.data.autologin;
        } else {
            // If bad resposne from advertiser, try to parse error message and store it in lead.
            response.formattedError = formatError(response.data);
        }

        // Section to store some kind of logs in lead
        const log = new LeadSendLog({
            leadId: leadId,
            status: response.status,
            data: response.data,
        });
        await log.save();

        return response;
    } catch(error) {
        // Default logic to parse response error
        const parseError = miscHelpers.parseRequestError(error, response);
        
        const log = new LeadSendLog({
            leadId: leadId,
            status: parseError.status,
            data: parseError.data,
            errorType: parseError.errorType,
            errorMessage: parseError.errorMessage
        });
        await log.save();
    }
}