const axios = require('axios');

const miscHelpers = require('../../../helpers/misc');
const leadHelpers = require('../../../helpers/lead');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

const defaultPassword = '123456789';

function formatError(errorObject) {
    const errorArray = [];

    if (errorObject.data) {
        if(Array.isArray(errorObject.data)) {
            errorObject.data.map(error => {
                errorArray.push(error.message)
            })
        }
    }

    if(typeof errorObject === 'string') {
        errorArray.push(errorObject)
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

    const affiliateId = advertiser.apiParameters.filter(param => param.name === 'affiliateId');
    const ownerId = advertiser.apiParameters.filter(param => param.name === 'ownerId');
    const authUrl = advertiser.apiParameters.filter(param => param.name === 'authUrl');
    const login = advertiser.apiParameters.filter(param => param.name === 'login');
    const password = advertiser.apiParameters.filter(param => param.name === 'password');

    const authData = {
        userName: login[0].value,
        password: password[0].value
    }

    const requestData = {
        password: defaultPassword,

        AffiliateId: affiliateId[0].value,
        OwnerId: ownerId[0].value,

        CampaignId: sendData.result,

        FirstName: lead.firstName, 
        LastName: lead.lastName, 
        Phone: lead.phone,
        Email: lead.email,
        Country: lead.country,
        IsGenerateToken: true
    };

    if(testLead) {
        response.requestData = requestData;
    }

    let token;
    try {
        const auth = await axios({
            url: authUrl[0].value,
            method: 'POST',
            data: authData
        });

        if(typeof auth.data === 'object') {
            token = auth.data.token
        }
    } catch (error) {
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

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        headers: {
            AuthToken: token
        },
        data: requestData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;

        if (response.status === 200) {
            response.sendStatus = true;
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