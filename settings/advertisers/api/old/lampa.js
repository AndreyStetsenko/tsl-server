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

    const token = advertiser.apiParameters.filter(param => param.name === 'token');
    const sid = advertiser.apiParameters.filter(param => param.name === 'sid');
    const tGeo = advertiser.apiParameters.filter(param => param.name === 'tGeo');

    const requestData = {
        unique_token: token[0].value,
        sid: sid[0].value,
        t_geo: tGeo[0].value,

        f_name: lead.firstName, // FirstName
        l_name: lead.lastName, // LastName
        email: lead.email, // email
        phone: lead.phone, // phone
        lang: lead.language,
        lp: lead.landingGroupName,
        lp_url: sendData.result,
        country: (lead.country).toUpperCase(), // country
        ip: lead.ip,
        // preland_name: prelandingPlug.status ? prelandingPlug.groupName.toUpperCase() : null,
        // preland_url: prelandingPlug.status ? prelandingPlug.plug : null,
    };

    const stringifiedData = queryString.stringify(requestData);
    const options = {
        url: `${advertiser.endpointSendLead}?${stringifiedData}`,
        method: 'POST',
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.data.success === true && response.status === 200) {
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