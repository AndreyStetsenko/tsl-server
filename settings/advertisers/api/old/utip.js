const md5 = require('md5');
const queryString = require('query-string');
const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

// const Lead = require('../../../models/Leads');

const randomParam = randomIntFromInterval(1000000, 99999999);
const key = md5('i8rEUCrbfeToG' + randomParam);

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function formatError(errorObject) {
    let errorArray = [];
    if (errorObject.description) {
        errorArray.push(errorObject.description);
    }

    if (errorObject.error) {
        for (const field in errorObject.error) {
            if (errorObject.error.hasOwnProperty(field)) {
                errorObject.error[field].map(error => {
                    errorArray.push(error);
                })
            }
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

    const status = (advertiser.apiParameters.filter(param => param.name === 'status'))[0];
    const affiliateId = (advertiser.apiParameters.filter(param => param.name === 'affiliate_id'))[0];

    const requestData = {
        key: key,
        rand_param: randomParam,
        status: status ? status.value : null,
        affiliate_id: affiliateId ? affiliateId.value : null,

        description: 'description',
        first_name: lead.firstName,
        second_name: lead.lastName,
        email: lead.email,
        phone: (lead.phone).replace('+', ''),
        country: lead.country,
        campaign_id: sendData.result,
    };

    if(testLead) {
        response.requestData = requestData;
    }

    const stringified = queryString.stringify(requestData);
    const options = {
        url: `${advertiser.endpointSendLead}?${stringified}`,
        method: 'GET',
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
        if (response.data.result === 'success' && response.data.error_number === 0) {
            response.sendStatus = true;
        } else if (response.data.result === 'failed' && response.data.error_number !== 0) {
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