const axios = require('axios');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

// const Lead = require('../../../models/Leads');

const flows = [
    { groupName: 'TON', flowKey: 'Ka2brHMgR1k0cupJXq4MvOoZMBlh5CR2hgpV3TCxNUYSi1wJXNc2qPWI3TbJryENwQnC1e6DwnB8Qw08QbPoNJYpwL5IiwjeWXP3WP98QFJ3LdDvHduE1UutN1zyLF6Kwz3eUb0xfyzeRbLTtiU9qTXDkM4KOEO8qH0NHq7APIUZC474pzk2z5nh5NwjcfpS0T0xCfU494nlYQneqF7QNZ1fmyBvACo24pNUwl' },
    { groupName: 'GRAM', flowKey: 'Ka2brHMgR1k0cupJXq4MvOoZMBlh5CR2hgpV3TCxNUYSi1wJXNc2qPWI3TbJryENwQnC1e6DwnB8Qw08QbPoNJYpwL5IiwjeWXP3WP98QFJ3LdDvHduE1UutN1zyLF6Kwz3eUb0xfyzeRbLTtiU9qTXDkM4KOEO8qH0NHq7APIUZC474pzk2z5nh5NwjcfpS0T0xCfU494nlYQneqF7QNZ1fmyBvACo24pNUwl' },
    { groupName: 'GAZ', flowKey: 'AoZHVgc5zkPpk7vYZzB25qKVtrB31DzqXzLCOQrV23ZhnTrlWxk5aNWCicUtW1qeS84smxHKkwrUmqS0wTqAnIpDDhp413nemRPt5uPWjHlGb5OnzbGLQSKypw1eR3uyT37hU130d1jryowakglVL6FeIe4dq1S9WZY3AIyOjiI0UqDqZeZoygDL6DwDo0efQRS0QkbhYwxkZkoJIIughmHZWouiav57W6Fd2M' },
    { groupName: 'TESLA', flowKey: 'WlTT8i7jnxCPxZAShBKLkSSSFlVpgfLKzCqI7vj2Xm4wO0U5uAx9eXvyWoW19qp9DqdV9ssF7CUMbWbBqrjWIyknL0tzvTSECqXWTljomcab7HfD8QXuBzfM8MV8uqgPUQPPpAbOMBtHWk5pcgxDXLkchqs75isMEfEfsPumt7UQP46wnZeUEv9aGiOxL7ZBtB0fiOgbFJvglbS261mnhvgjMyzpIH3QrY5CA0' },
    { groupName: 'YANDEX', flowKey: '1olsU4GETIprDqg2rPdlZjEe9PFNpHDAivhyV7OeLyJ0pD99febRFBe4bBWHP74s5fvcz41m28xCzPgyQN9cGw0JTSMVauOBiojywudxqJ3aPoCYkBUWOE8pB7Py5VvQxe3NAZR8YM6Yq3fH78JNaWhCxeUfwVzCAMlTF1taaUC4RLGvsZBacroG1LtxGJCKKZnia2pslDo48Is1HQd53t14dSccBdopEoRl1Y' }
];

function formatError(errorObject) {
    const errorArray = [];
    const parsedErrors = errorObject.errors;

    if (errorObject.message && typeof parsedErrors === 'string') {
        errorArray.push(errorObject.message);
    } else if (typeof parsedErrors === 'object') {
        for (const field in parsedErrors) {
            if (parsedErrors.hasOwnProperty(field)) {
                for (const errorType in parsedErrors[field]) {
                    if(parsedErrors[field].hasOwnProperty(errorType)) {
                        errorArray.push(parsedErrors[field][errorType]);
                    }
                }
            }
        }
    }

    if (errorArray.length > 0) {
        return errorArray.join(',');
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
        filtered = flow[0].flowKey;
        return filtered;
    } else {
        return flows[0].flowKey;
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

    const flowPartnerKey = getPartnerFlow(lead.landingGroup);

    const requestData = {
        api_key: flowPartnerKey,

        firstname: lead.firstName, 
        lastname: lead.lastName, 
        phone: lead.phone,
        email: lead.email,
        domain: sendData.result,
        clickid: leadId,
    };

    const options = {
        url: advertiser.endpointSendLead,
        method: 'POST',
        data: requestData
    };

    try {
        const result = await axios(options);
        response.status = result.status;
        response.data = result.data;
    
        if (response.status === 201) {
            if(leadId) {
                await Lead.updateOne(
                    { _id: leadId },
                    { sendBody: requestData }
                )
            }
        
            response.sendStatus = true;
            // response.partnerRedirectUrl = response.data.autologin;
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