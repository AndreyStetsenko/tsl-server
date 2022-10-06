const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');

const leadHelpers = require('../../../helpers/lead');
const miscHelpers = require('../../../helpers/misc');

const Advertiser = require('../../../models/Advertisers');
const LeadSendLog = require('../../../models/Lead-Send-Logs');

// Google Spreadsheet integration
const googleClientEmail = 'leads-756@traf-281215.iam.gserviceaccount.com';
const googlePrivateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAEjSO041olD+A\nL/7H/qZcseAD2jKfEsfAnubea8a7MBbXoZRvy0ohxEDA2zHptQBWmulA2MI6pZrQ\nsc00JUX6IJTMKOy5tfnkJhe0EbLaFcaMjVEZyufubSF3KZz2ukXFfWbGI6zcKMCz\n3KGJPsnvOUtUNP53WiCY2PQgOjCW5ri92VVubRNFhzNkjZsl4NQAHQDDPB2a0Q6c\nTnZlNRMq+k7vhc4O/Dn8qdguMRRh3pdIjhH4hJoNP/K801BlxEYYXGY4AfAtNCy5\nfzzCvZJMrXnGM2USoNvQuBWaNxMUF/p122yZf6DMQ9siGnKEN1unaV2a4sQoNbHB\nS69HOxuRAgMBAAECggEAAvvFaTqMBcXXvqwALycbenEg465t/t6Rz8IoH+hYq+ux\nTyQpZBsqSZ/8yYIeIl03ZiD94o37ZmHQJ9G7OEYj8iCzbwBrvO7AtPSKhbeIqa6Q\n6PoA+n+WXrO/Q1SYJZT7JHgwMn+3XawcYi7ZK4KYLGkdbG9uTHhP7U/haua8fnuM\nGeuTEq4IF4lxumZQ2FL1aBTQSc/etTkQMVz/n3Ympd2eGdAHazRvnN0kQOHzL93H\nr2j+HBJaMT407FwoFHGEBpYCkGgbBLDeyFCJJIXTcOPCslAd3l9Q00t+WRdMeaQB\nWNOM3Jwj8AfhsLQw/7rxmRGPeAAjBwAkq2AvCNYAgQKBgQDncB+XPxvuKnQvXsEd\nvulOgyAXyZVDWrc5aRkdOlWFbTCA38p+e+mxn2kQujhxXAcsEyxM6Em1SqxBR17Q\nKCeyQ71g5LUKe5apzK3RBYf5CnLEN6+KD++DjmcI9fh3yZDMQc0ZSvyAOkL7Yt4k\nvY9wPtrFm1Ebt3UWwcc55BE+GQKBgQDUdIi1EV2GSHTFskxtpmM4Rp1B1uibnDKf\nx8f1+KKraTn4c8kVbOKMD5wI1HxkM13RgqpQnXElPTIUZZeYu/P45bZevsM8ABpf\n7HyPLqG9yztQ8uZjL6j/FXlf+9ieEpSC/gPXip0kjQT3vcGo1D/6fmU3ivwGNJt4\nam45yH+IOQKBgDs5qyvmP3yEKrVQlzTIfSXVUmoj8OmKlma/qWicW/RIC+h+3G/f\nv97vf1CDhxwjQ8aYpXaM3wfgsxIFdJLqI7ZvtU/NVzL2i4iqUzSxKKmnbdUetvIq\nv803rNBTOaFV2JMcp6K4WMNrpWZ1V4mpZMKBozR8WZYxLWqEbjo3Td5JAoGAfYOz\nWDXAKRsZUcq6eHU6XP7q3QDYP0aSae8fZWPUxqvOAch13eCMHu8B4f2W16O5I5Os\nhx/cvoFe2soCO8ueoUck7OiKcyIkctNF61lDWNt+WZ6HGcYIc1r+cARbv1d+wbzM\nDETp/bQKYUqL5PAwNA8EQUItDoV57DQElsKrBZECgYEAjQ7tG2NpxNMuVSN+nGG7\nix2REmwRAXl/ml37Ms0R265juLLNsXPLWDQZJ9IA0n9H6fORkJzlWZKaYaUWD0n+\nSKGd7k4wBPqyMulO0EjdCqUVWO1xfPltvm9Rqg9uTnAop+wBslLph8wNeFrfXQ8w\nnSCN1ZoIhfSdwnXgzdX4S8s=\n-----END PRIVATE KEY-----\n';

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

    const googleSheetId = advertiser.apiParameters.filter(param => param.name === 'googleSheetId');

    const doc = new GoogleSpreadsheet(googleSheetId[0].value);
    await doc.useServiceAccountAuth({
        client_email: googleClientEmail,
        private_key: googlePrivateKey,
    });

    if(testLead) {
        response.requestData = {
            'Дата': moment().tz(process.env.TIMEZONE).format('DD.MM.YYYY'),
            'Время': moment().tz(process.env.TIMEZONE).format('HH:mm'),
            'Имя': lead.firstName,
            'Фамилия': lead.lastName,
            'Телефон': lead.phone,
            'Имейл': lead.email,
            'Страна': lead.country,
            'Язык': lead.language,
            'Воронка': lead.landingGroupName,
            'Ссылка': sendData.result
        };
    }

    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow(
            { 
                'Дата': moment().tz(process.env.TIMEZONE).format('DD.MM.YYYY'),
                'Время': moment().tz(process.env.TIMEZONE).format('HH:mm'),
                'Имя': lead.firstName,
                'Фамилия': lead.lastName,
                'Телефон': lead.phone,
                'Имейл': lead.email,
                'Страна': lead.country,
                'Язык': lead.language,
                'Воронка': lead.landingGroupName,
                'Ссылка': sendData.result
            }
        );

        response.sendStatus = true;

        const log = new LeadSendLog({
            leadId: leadId,
            data: {
                message: 'Google row added'
            },
        });
        await log.save();

        return response;
    } catch(error) {
        response.formattedError = error.message;

        const log = new LeadSendLog({
            leadId: leadId,
            errorMessage: error.message
        });
        await log.save();

        return response;
    }
}