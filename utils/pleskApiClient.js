const { logger } = require('../logger/index');
const https = require('https');
const axios = require('axios');
const _ = require('lodash');
const xml2js = require('xml2js');
const telegram = require('./telgramBot');
const util = require('util');

const domainHelpers = require('../helpers/sites/domains');

const DEFAULT_EMAIL = 'Fb.trafic@gmail.com';

class Client {

    constructor() {
        this._platform = 'PLESK';
        this._host = process.env.PLESK_HOST;
        this._port = process.env.PLESK_PORT;
        this._login = process.env.PLESK_LOGIN;;
        this._password = process.env.PLESK_PASSWORD;;
    }

    async _parseXML(data){
        const parser = new xml2js.Parser({explicitArray : false, mergeAttrs : true});

        return new Promise((resolve, reject) => {
            parser.parseString(data, (err, parsed) => {
                if(err) reject(err);
                resolve(parsed);
            });
       });
    };

    async _requestXML(type, action, data, stepName, chatMessage) {
        const response = {
            platform: this._platform,
            stepName,
            chatMessage,
            requestStatus: false,
        };

        let headers = {
            'Content-type': 'text/xml',
            'HTTP_PRETTY_PRINT': 'TRUE',
            'HTTP_AUTH_LOGIN': this._login,
            'HTTP_AUTH_PASSWD': this._password,
        };

        const options = {
            url: `${this._host}:${this._port}/enterprise/control/agent.php`,
            method: 'POST',
            data: data,
            headers: headers,
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        };

        try {
            const result = await axios(options);

            response.status = result.status;
            response.fullData = await this._parseXML(result.data);

            // Check request status
            if (_.get(response.fullData, 'packet.system.status') === 'error') {

                response.requestErrorMessage = response.fullData.packet.system.errtext;
                response.requestStatus = false;
            } else {
                response.requestStatus = true;
            }

            // Check step status
            if (_.get(response.fullData, `packet.${type}.${action}.result.status`) === 'error') {
                response.stepErrorMessage = response.fullData.packet[type][action].result.errtext;
                response.data = response.fullData.packet[type][action].result;
            } else if (_.get(response.fullData, `packet.${type}.${action}.result.status`) === 'ok') {
                response.stepStatus = true;
                response.data = response.fullData.packet[type][action].result;
            } else if (_.get(response.fullData, `packet.${type}.${action}.result[0].status`) === 'ok') {
                response.stepStatus = true;
                response.data = response.fullData.packet[type][action].result;
            }

            return response;        
        } catch(error) {
            if (error.isAxiosError) {
                response.requestStatus = false;
                response.stepStatus = false;
                response.status = error.response.status;
                response.requestErrorMessage = error.response.data.message
                response.data = error.response.data;
    
                return response;
            } else {
                logger.error('', error)
                throw error;
            }
        }
    }

    async _requestApi(data, stepName, chatMessage) {
        const response = {
            platform: this._platform,
            stepName,
            chatMessage,
            requestStatus: false,
            stepStatus: false,
        };

        const options = {
            url: `${this._host}:${this._port}/api/v2/cli/extension/call`,
            method: 'POST',
            data: data,
            auth: {
                username: this._login,
                password: this._password,
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        };

        try {
            const result = await axios(options);

            response.status = result.status;
            response.data = result.data;

            if(response.status === 200) {
                response.requestStatus = true;
                if(response.data.code === 0) {
                    response.stepStatus = true;
                } else {
                    response.stepErrorMessage = response.data.stderr;
                }
            }
        
            return response;        
        } catch(error) {
            if (error.isAxiosError) {
                response.requestStatus = false;
                response.status = error.response.status;
                response.requestErrorMessage = error.response.data.message
                response.data = error.response.data;
    
                return response;
            } else {
                logger.error('', error)
                throw error;
            }
        }
    }

    // async getDomainInformation(domain) {
    //     const body = `
    //     <packet>
    //     <site>
    //         <get>
    //            <filter>
    //                 <name>${domain}</name>
    //            </filter>
    //            <dataset>
    //                 <hosting/>
    //            </dataset>
    //         </get>
    //     </site>
    //     </packet>
    //     `;
    //     try {
    //         const request = await this._requestXML(body);

    //         return request;
    //     } catch(error) {
    //         logger.error('', error)
    //         throw error;
    //     }
    // }

    async getAllWebsapces() {
        const requestType = 'webspace';
        const actionType = 'get';
        const stepName = 'Получение всех пространств';
        const chatMessage = 'Все пространства получены: ';
        const body = `
        <packet>
            <webspace>
                <get>
                    <filter/>
                    <dataset>
                        <hosting/>
                    </dataset>
                </get>
            </webspace>
        </packet>
        `;
        try {
            const request = await this._requestXML(requestType, actionType, body, stepName, chatMessage);

            return request;
        } catch(error) {
            logger.error('', error)
            throw error;
        }
    };

    async addDomain(webspaceId, domain) {
        const requestType = 'site';
        const actionType = 'add';
        const stepName = `Добавление домена в пространство - ${webspaceId}`;
        const chatMessage = `Домен ${domain}, установлен: `;
        
        const body = `
        <packet>
            <site>
            <add>
                <gen_setup>
                    <name>${domain}</name>
                    <webspace-id>${webspaceId}</webspace-id>
                </gen_setup>
                <hosting>
                    <vrt_hst>
                        <property>
                            <name>ssl</name>
                            <value>true</value>
                        </property>
                        <property>
                            <name>php</name>
                            <value>true</value>
                        </property>
                        <property>
                            <name>webstat</name>
                            <value>awstats</value>
                        </property>
                        <property>
                            <name>webstat_protected</name>
                            <value>true</value>
                        </property>
                        <property>
                            <name>errdocs</name>
                            <value>true</value>
                        </property>
                        <property>
                            <name>fastcgi</name>
                            <value>true</value>
                        </property>
                        <property>
                            <name>cgi_mode</name>
                            <value>webspace</value>
                        </property>
                        <property>
                            <name>www_root</name>
                            <value>/${domain}</value>
                        </property>
                        <property>
                            <name>waf-rule-engine</name>
                            <value>off</value>
                        </property>
                    </vrt_hst>
                </hosting>
                </add>
            </site>
            </packet>
        `;
        try {
            const request = await this._requestXML(requestType, actionType, body, stepName, chatMessage);

            return request;
        } catch(error) {
            logger.error('', error)
            throw error;
        }
    }

    async addSubDomain(domain, subdomain) {
        const requestType = 'subdomain';
        const actionType = 'add';
        const stepName = `Добавление сабдомена - ${subdomain}`;
        const chatMessage = `Сабдомен ${subdomain}, установлен в домен ${domain}: `;
        
        const body = `
        <packet>
            <subdomain>
                <add>
                    <parent>${domain}</parent>
                    <name>${subdomain}</name>
                    <property>
                        <name>www_root</name>
                        <value>/${domain}/${subdomain}.${domain}</value>
                    </property>
                    <property>
                        <name>ssl</name>
                        <value>true</value>
                    </property>
                    <property>
                        <name>php</name>
                        <value>true</value>
                    </property>
                </add>
            </subdomain>
        </packet>
        `;

        try {
            const request = await this._requestXML(requestType, actionType, body, stepName, chatMessage);

            return request;
        } catch(error) {
            logger.error('', error)
            throw error;
        }
    }

    async deleteDomain(domain) {
        const requestType = 'site';
        const actionType = 'del';
        const stepName = `Удаление домена ${domain}`;
        const chatMessage = `Домен ${domain}, удален`;
        
        const body = `
        <packet>
        <site>
            <del>
                <filter>
                    <name>${domain}</name>
                </filter>
            </del>
        </site>
        </packet>
        `;
        try {
            const request = await this._requestXML(requestType, actionType, body, stepName, chatMessage);

            return request;
        } catch(error) {
            logger.error('', error)
            throw error;
        }
    }

    async addSslCertificate(domain) {
        const stepName = 'Установка SSL сертификата';
        const chatMessage = `Домен ${domain}, получил SSL сертификат: `;

        const body = {
            params: [ 
                '--exec',
                'letsencrypt',
                'cli.php',
                '-d',
                domain,
                '-d',
                `www.${domain}`,
                '-m',
                DEFAULT_EMAIL
            ]
        };

        try {
            const request = await this._requestApi(body, stepName, chatMessage);

            return request;
        } catch(error) {
            logger.error('', error)
            throw error;
        }
    }

}

exports.Client = Client;