const request = require('request-promise');
const querystring = require('querystring');

const miscHelpers = require('./misc');

const unisenderAdress = 'https://api.unisender.com/ru/api';
const API_KEY = process.env.U_API_KEY;
// const API_KEY = '61ehdg6817w7mdo5tkicfqetw6jz4x963551rs1y';

async function callApi (path, method, data) {
    const requestParams = querystring.stringify(data);
    const url = `${unisenderAdress}/${path}?${requestParams}`
    const options = {
        method: method,
        url: url,
        form: {
            api_key: API_KEY
        }
    };
    const response = await request(options);
    const parsedResponse = JSON.parse(response);

    if (parsedResponse.error) throw new Error (parsedResponse.error);
    return parsedResponse.result;
}

exports.subscribeUser = async (firstName, lastName, email, partner, offer, language) => {
    const requestPath = 'subscribe';
    const requestType = 'POST';

    try {
        const mailListId = miscHelpers.retrieveListId(partner, offer, language);
        const requestData = {
            'fields[Name]': firstName,
            'fields[Surname]': lastName,
            'fields[email]': email,
            'list_ids': mailListId,
            'double_optin': '3'
        };

        const response = await callApi(requestPath, requestType, requestData);
        return response.person_id;
    } catch(error) {
        throw new Error(error);
    }
};