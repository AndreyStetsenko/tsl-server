const { logger } = require('../logger');
const dns = require('dns');
const { Resolver } = require('dns').promises;
const resolver = new Resolver();

// Add google DNS servers
dns.setServers([
    '8.8.8.8',
    '2001:4860:4860::8888'
]);

async function lookupPromise(domain){
    return new Promise((resolve, reject) => {
        dns.resolveAny(domain, (err, address) => {
            if(err) reject(err);
            resolve(address);
        });
   });
};

exports.getDomainDetails = async (domain) => {
    try {
        const lookup = await lookupPromise(domain);

        const aRecords = lookup.filter(l => l.type === 'A').map(record => record['address']);
        const nsRecords = lookup.filter(l => l.type === 'NS').map(record => record['value']);

        return {
            aRecords,
            nsRecords,
            domainExist: true
        }
    } catch(error) {
        if(error.code === 'ENOTFOUND' || error.code === 'ESERVFAIL') {
            logger.error('', error);
            return { aRecords: [], nsRecords: [], domainExist: false };
        } else {
            logger.error('', error);
        }
    }
}

exports.isDomainAvailable = async (domain) => {
    try {
        const check = await resolver.resolve4(domain);
        return !check ? true : false;
    } catch(error) {
        if(error.code === 'ENOTFOUND') {
            return true;
        } else {
            return false;
        }
    }
}

