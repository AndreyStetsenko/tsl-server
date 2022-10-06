const md5 = require('md5');
const queryString = require('query-string');
const axios = require('axios');

const leadHelpers = require('../../../../helpers/lead');
const miscHelpers = require('../../../../helpers/misc');

const Advertiser = require('../../../../models/Advertisers');
const LeadSendLog = require('../../../../models/Lead-Send-Logs');

const randomParam = randomIntFromInterval(1000000, 99999999);
const key = md5('i62fx7rSIJvSBw5' + randomParam);

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

function getDeskId(language) {
    let deskId = 5;
    if (language.toLowerCase() === 'ru') {
        deskId = 5;
    } else if (language.toLowerCase() === 'en') {
        deskId = 41;
    }

    return deskId;
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

    const deskId = getDeskId(lead.language);

    const requestOptions = {
        key: key,
        rand_param: randomParam,
        desk_id: deskId,

        description: lead.sub9 ? lead.sub9 : 'description',
        first_name: lead.firstName,
        second_name: lead.lastName,
        email: lead.email,
        phone: (lead.phone).replace('+', ''),
        country: lead.country,
        tag_1: sendData.result, 
        tag_2: lead.sub8
    };

    const stringified = queryString.stringify(requestOptions);
    const options = {
        url: `${advertiser.endpointSendLead}?${stringified}`,
        method: 'GET',
    };

    try {
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