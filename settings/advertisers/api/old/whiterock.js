const queryString = require('query-string');
const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

// const Lead = require('../../../models/Leads');
const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject.errors) {
        if(errorObject.errors.message) {
            errorArray.push(errorObject.errors.message);
        }
        if(typeof errorObject.errors === 'string' ) {
            errorArray.push(errorObject.errors);
        }
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

    const pid = (advertiser.apiParameters.filter(param => param.name === 'pid'))[0];

    const requestData = {
        pid: pid ? pid.value : null,

        firstname: lead.firstName,
        lastname: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        geo: lead.country,
        lang: lead.language,
        funnel: sendData.result,
        ip2: lead.ip,
        cid: leadId,
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const stringifiedData = queryString.stringify(requestData);
    const options = {
        url: `${advertiser.endpointSendLead}?${stringifiedData}`,
        method: 'POST',
        // data: requestData
    };

    try {
        // if(leadId) {
        //     await Lead.updateOne(
        //         { _id: leadId },
        //         { sendBody: requestData }
        //     )
        // }

        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200 && response.data.status == 1) {
            response.sendStatus = true;
            if(response.data.autologin == 1) {
                response.partnerRedirectUrl = response.data.autologin_link;
            }
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