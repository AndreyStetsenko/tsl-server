const axios = require('axios');
const miscHelpers = require('../../../helpers/misc');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

// const partnerUrl = 'https://marketing.affboat.com/api/v3/integration?api_token=';
// const apiKey = 'GPSkpz92v0rnGYXaDycSDn6z3eqzaZ4TYnOPEpXAuL26Zu9pS5NhI5y77Ooz';
const defaultPassword = 'jadhsfhg6sfg';
// const defaultLinkId = '715';

const statusMapping = [
    { partnerStatus: "System Error",        dbStatus: "Error" },
    { partnerStatus: "Fraud",               dbStatus: "Invalid"},
    { partnerStatus: "No Answer 5-Day",     dbStatus: "No answer" },
    { partnerStatus: "Recovery",            dbStatus: "Recovery" },
    { partnerStatus: "Check number",        dbStatus: "Check number" },
    { partnerStatus: "Wrong number",        dbStatus: "Wrong number" },
    { partnerStatus: "No Answer NI",        dbStatus: "No answer" },
    { partnerStatus: "Duplicate",           dbStatus: "Duplicate" },
    { partnerStatus: "New",                 dbStatus: "New" },
    { partnerStatus: "System Duplicate",    dbStatus: "Duplicate" },
    { partnerStatus: "Call again",          dbStatus: "Callback" },
    { partnerStatus: "Age less 18",         dbStatus: "Under 18" },
    { partnerStatus: "Not intrested",       dbStatus: "Not interested" },
    { partnerStatus: "No interested",       dbStatus: "Not interested" },
    { partnerStatus: "NA more >5d",         dbStatus: "Not interested" },
    { partnerStatus: "Decline",             dbStatus: "Decline" },
    { partnerStatus: "Change voice",        dbStatus: "Voice" },
    { partnerStatus: "No answer",           dbStatus: "No answer" },
    { partnerStatus: "FTD",                 dbStatus: "FTD" },
    { partnerStatus: "In Practice",         dbStatus: "In Practice" },
    { partnerStatus: "В работе",            dbStatus: "In Practice" },

    { partnerStatus: "DO NOT CONTACT",      dbStatus: "Decline" },
    { partnerStatus: "CALL AGAIN",          dbStatus: "Callback" },
    { partnerStatus: "CALL AGAIN GENERAL",  dbStatus: "Callback" },
    { partnerStatus: "NOT INTEREST",        dbStatus: "Not interested" },
    { partnerStatus: "REASSAIGN",           dbStatus: "Reassaign" },
    { partnerStatus: "NEW",                 dbStatus: "New" },
];  

exports.retrieveStatus = (status) => {
    const result = statusMapping.filter(mapping => {
        return mapping.partnerStatus.toUpperCase() ==  status.toUpperCase();
    });

    if(result.length > 0) {
        return result[0].dbStatus;
    } else {
        return 'СТАТУС НЕ НАЙДЕН';
    }
}

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

    const apiKeyParameter = advertiser.apiParameters.filter(param => param.name === 'apiKey');
    const linkIdParameter = advertiser.apiParameters.filter(param => param.name === 'linkId');

    const requestData = {
        password: defaultPassword,
        link_id: linkIdParameter[0].value,

        fname: lead.firstName,
        lname: lead.lastName,
        email: lead.email,
        fullphone: lead.phone,
        ip: lead.ip ? lead.ip : miscHelpers.randomIpGenerator(),
        source: lead.landingGroupName,
        domain: sendData.result,
        description: '', //prelandingPlug.status ? prelandingPlug.plug : null,

        click_id: lead._id ? lead._id : lead.id,
    };

    const options = {
        url: `${advertiser.endpointSendLead}${apiKeyParameter[0].value}`,
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