const axios = require('axios');
const queryString = require('query-string');
const qs = require('qs');
const { logger } = require('../logger/index');
const _ = require('lodash');

class Client {

    constructor() {
        this._platform = 'REG.RU'
        this._host = process.env.REG_RU_HOST;
        this._login = process.env.REG_RU_LOGIN;
        this._password = process.env.REG_RU_PASSWORD;
        this._defaultPeriod = 1;
        this._defaultProfileName = 'default_profile';
    }

    _getProfileType(domain) {
        const domainType = domain.split('.')[1];

        if(!domainType) return '';

        let mappedType;

        if(domainType.toUpperCase() === 'RU') {
            mappedType = 'RU.PP';
        } else {
            mappedType = 'GTLD';
        };

        return mappedType;
    }

    async _request(url, data, stepName) {
        const response = {
            platform: this._platform,
            stepName,
            requestStatus: false,
            stepStatus: false,
        };

        const requestData = {
            username: this._login,
            password: this._password,
            input_format: "json",
            output_format: "json",
            io_encoding: "utf8",
            show_input_params: 0,
            input_data: JSON.stringify(data)
        }

        const options = {
            url: `${this._host}${url}`,
            method: 'POST',
            params: requestData,
        };

        try {
            const result = await axios(options);

            response.status = result.status;
            response.data = result.data;

            if(result.status === 200 && result.data.result === 'success') {
                response.requestStatus = true;
                if(_.get(response.data, 'answer.domains')) {
                    response.stepStatus = result.data.answer.domains[0].result === 'success' ? true : false;
                    response.stepErrorMessage = result.data.answer.domains[0].error_text;
                } else {
                    response.stepStatus = true
                }
            } else {
                response.requestErrorMessage = result.data.error_text;
            }
            
            return response;
        
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

    async getServiceList() {
        const url = 'service/get_list';
        const data = {};

        try {
            const request = await this._request(url, data);
            return request;
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

    // async checkDomainExistance

    async registerDomain(domain, nss) {
        const stepName = `Регистация домена - ${domain}`;
        const url = 'domain/create';
        
        const domainType = this._getProfileType(domain);

        // Prepare NSS servers
        const preparedNss = {};
        nss.map((ns, index) => {
            const name = 'ns' + index;
            preparedNss[name] = ns;
        });

        const data = {
            profile_type: domainType,
            profile_name: this._defaultProfileName,
            domains: [{ dname: domain }],
            private_person_flag: 1,
            period: this._defaultPeriod,
            nss: preparedNss,
        };

        try {
            const request = await this._request(url, data, stepName);
            return request;
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

    async updatePrivatePerson(domain, flag) {
        const url = 'domain/update_private_person_flag';

        const data = {
            domains: [{ dname: domain }],
            private_person_flag: flag ? 1 : 0,
        };

        try {
            const request = await this._request(url, data);
            return request;
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

    async addDnsRecord(domain, subdomain, ipadress) {
        const stepName = `Добавление записи - ${subdomain}: ${ipadress}`;
        const url = 'zone/add_alias';

        const data = {
            domains: [{ dname: domain }],
            subdomain: subdomain,
            ipaddr: ipadress
        };

        try {
            const request = await this._request(url, data, stepName);
            return request;
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

    async deleteAllRecords(domain) {
        const stepName = 'Удаление всех записей у домена';
        const url = 'zone/clear';

        const data = {
            domains: [{ dname: domain }],
        };

        try {
            const request = await this._request(url, data, stepName);
            return request;
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

    async testDomain(domain, nss) {
        const stepName = 'Тестовове добавление домена';
        const url = 'domain/nop';

        const data = {
            domains: [{ dname: domain }],
        };

        try {
            const request = await this._request(url, data, stepName);
            return request;
        } catch(error) {
            logger.error('', error);
            throw error;
        }
    }

}

exports.Client = Client;