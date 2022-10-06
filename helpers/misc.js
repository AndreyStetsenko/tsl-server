const moment = require('moment');
const _ = require('lodash');
const tunnel = require('tunnel');
const StackTracey = require('stacktracey');

const languages = require('../settings/languages');
const countries = require('../settings/countries');

exports.promiseSleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

exports.getRandomNumberBetween = (firstNumber, secondNumber) => {
    return _.random(firstNumber, secondNumber);
}

exports.generateFlowId = () => {
    const flowId = `f${(~~(Math.random()*1e8)).toString(16)}`;
    return flowId;
}

exports.isCountryValid = (countryCode) => {
    const upperCountryCode = countryCode.toUpperCase();
    const exist = (country) => country.id === upperCountryCode;
    
    return countries.some(exist);
}

exports.getCountryDetails = (countryCode) => {
    const details = countries.filter(country => {
        return country.id === countryCode.toUpperCase()
    });

    return details[0];
};

exports.getLanguageDetails = (languageCode) => {
    const details = languages.filter(language => {
        return language.id === languageCode.toUpperCase()
    });

    return details[0];
};

exports.isLanguageValid = (languageCode) => {
    const upperLanguageCode = languageCode.toUpperCase();
    const exist = (language) => language.id === upperLanguageCode;
    
    return languages.some(exist);
};

exports.randomIpGenerator = () => {
    const ip = (Math.floor(Math.random() * 255) + 1)+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255))+"."+(Math.floor(Math.random() * 255));
    return ip;
}

exports.retrieveStartDateTime = (date) => {
    let startDate;
    date ? startDate = new Date(startDateString) : startDate = new Date();
    startDate.setHours(0, 0, 0);
    return startDate;
};

exports.getStartEndTime = (timeDiff) => {
    // timeDiff in next fromat => '09:00-23:58'
    const diff = {
        start: {
            hour: (timeDiff.split('-')[0]).split(':')[0],
            minute: (timeDiff.split('-')[0]).split(':')[1]
        },
        end: {
            hour: (timeDiff.split('-')[1]).split(':')[0],
            minute: (timeDiff.split('-')[1]).split(':')[1]
        }
    };

    const startTime = moment().tz(process.env.TIMEZONE).set(
        {
            hour: parseInt(diff.start.hour,10),
            minute: parseInt(diff.start.minute,10),
            second: 0,
            millisecond: 0
        });
    const ccEndWorkTZ = moment().tz(process.env.TIMEZONE).set(
        {
            hour: parseInt(diff.end.hour,10),
            minute: parseInt(diff.end.minute,10),
            second: 0,
            millisecond: 0
        });

    return {
        startTime: startTime,
        endTime: ccEndWorkTZ
    };
}

exports.returnStartDateWithUTC = (date) => {
    const updatedDate = date ? moment(date) : moment();

    updatedDate.tz(process.env.TIMEZONE).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

    const isoDate = updatedDate.toDate();
    return isoDate;
};

exports.returnEndDateWithUTC = (date) => {
    const updatedDate = date ? moment(date) : moment();

    updatedDate.tz(process.env.TIMEZONE).set({ hour: 23, minute: 59, second: 59, millisecond: 0 });

    const isoDate = updatedDate.toDate();
    return isoDate;
};

exports.isIdValidForMongo = (id) => {
    const isValid = id.match(/^[0-9a-fA-F]{24}$/);
    return isValid;
};

exports.getProxySettings = () => {
    const ip = process.env.PROXY_IP;
    const port = process.env.PROXY_PORT;
    const login = process.env.PROXY_LOGIN;
    const password = process.env.PROXY_PASSWORD;

    const httpsAgent = tunnel.httpsOverHttp({
        proxy: {
           host: ip,
           port: port,
           proxyAuth: `${login}:${password}`
        },
    });

    return httpsAgent;
}

exports.generateRandomString = (length, characters) => {
    if(!length || length === 0) return null;

    const  result = [];
    for ( let i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }

    return result.join('');
}

exports.parseRequestError = (errorObject, responseObject) => {
    responseObject.errorMessage = errorObject.message;

    if(errorObject.response) {
        responseObject.errorType = 'Response';
        responseObject.status = errorObject.response.status;
        responseObject.data = errorObject.response.data;
    } else if (errorObject.request) {
        responseObject.errorType = 'Request';
    } else {
        responseObject.errorType = 'Other';
        const stack = new StackTracey(errorObject);

        if(stack.items.length !== 0) {
            responseObject.data = {
                fileName: stack.items[0].fileName,
                line: stack.items[0].line,
                column: stack.items[0].column
            }
        }
    }

    return responseObject;
}