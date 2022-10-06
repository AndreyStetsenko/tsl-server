const handler = require('../../utils/responseHandler');
const { logger } = require('../../logger/index');
const _ = require('lodash');
const telegram  = require('../../utils/telgramBot');
const moment = require('moment');
const generatorUtils = require('../../utils/domainGenerator/generator');
const Joi = require('joi');

const domainHelpers = require('../../helpers/sites/domains');

const dnsUtils = require('../../utils/dns');

const regRuApi = require('../../utils/regRuApiClient'); 
const pleskApi = require('../../utils/pleskApiClient');

const regRuClient = new regRuApi.Client();
const pleskClient = new pleskApi.Client();

const Domain = require('../../models/Domains');
const Config = require('../../models/Config');

const joiOptions = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true // remove unknown props
};

exports.getDomains = async (req, res) => {
    try {
        const domains = await Domain.find({});

        await handler.pResponse(res, {
            message: 'Domains list',
            domains: domains,
            total: domains.length
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.getPleskWebspaces = async (req, res) => {
    try {
        const request = await pleskClient.getAllWebsapces();

        let dirtyWebspaces = [];

        if(request.requestStatus && request.stepStatus) {
            // If olny one websapce, add it ot array (XML parser feature)
            if(!request.data.length) {
                dirtyWebspaces.push(request.data)
            } else {
                dirtyWebspaces = request.data;
            }
        }
        
        const webspaces = [];
        dirtyWebspaces.map(wspace => {
            webspaces.push({
                id: wspace.id,
                name: wspace.data.hosting.vrt_hst.property.filter(prop => prop.name === 'ftp_login')[0].value,
                // password: wspace.data.hosting.vrt_hst.property.filter(prop => prop.name === 'ftp_password')[0].value,
                ip: wspace.data.hosting.vrt_hst.ip_address
            });
        })

        await handler.pResponse(res, {
            message: 'Webspace list',
            webspaces,
            total: webspaces.length
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.addDomain = async (req, res) => {
    const { userId } = { ...req.userData };
    const {
        name,
        nsServers,
        registerDomain,
        ipAdress,
        addToServer,
        addSsl,
        webspaceId,
        webspaceName
    } = { ...req.body };

    if (!name) return handler.errorMessage(res, 'Domain name cannot be empty!');
    if (!ipAdress) return handler.errorMessage(res, 'Domain ip adress cannot be empty!');

    try {
        const exist = await Domain.findOne({
            name: name.toLowerCase()
        });

        if (exist) return handler.errorMessage(res, 'Такой домен есть в базе.');

        // Check if we need to register domain
        if(registerDomain) {
            // const register = await regRuClient.registerDomain(name, nsServers);
            const register = await regRuClient.registerDomain(name, nsServers);

            if(register.requestStatus && register.stepStatus) {
                const currentRecords = await dnsUtils.getDomainDetails(name);
                const isARecordActive = currentRecords.aRecords.includes(ipAdress);

                const domain = new Domain({
                    name,
                    nsServers,
                    ipAdress,
                    aRecordActive: isARecordActive,
                    isPleskInstalled: false,
                    isSslInstalled: false,
                    creator: userId,
                });
                await domain.save();

                // Log domain registartion
                await domainHelpers.addLogRecord(domain._id, register);

                // Delete all records
                const deleteRecords = await regRuClient.deleteAllRecords(name);
                await domainHelpers.addLogRecord(domain._id, deleteRecords);

                // Add records
                const addMainRecord = await regRuClient.addDnsRecord(name, '@', ipAdress);
                await domainHelpers.addLogRecord(domain._id, addMainRecord);

                const addWWWRecord = await regRuClient.addDnsRecord(name, 'www', ipAdress);
                await domainHelpers.addLogRecord(domain._id, addWWWRecord);

                const addAllSubRecord = await regRuClient.addDnsRecord(name, '*', ipAdress);
                await domainHelpers.addLogRecord(domain._id, addAllSubRecord);

                // Install domain on PLESK server
                if(addToServer) {
                    pleskClient.addDomain(webspaceId, name)
                        .then(async plesk => {
                            const isPleskInstalled = plesk.requestStatus && plesk.stepStatus;

                            await domainHelpers.addLogRecord(domain._id, plesk);
                            const userMessage = `${plesk.chatMessage} ${isPleskInstalled ? '*УСПЕШНО*' : '*НЕУСПЕШНО*'}`;
                            if(isPleskInstalled) {
                                await Domain.updateOne({ _id: domain._id },{ isPleskInstalled: true, webspaceId: webspaceId, webspaceName: webspaceName, pleskId: plesk.data.id });
                            }
                
                            await telegram.sendMessage(userMessage, 'dev');

                            // Check if need to install SSL certificate
                            const addSslRule = addSsl && isPleskInstalled && isARecordActive;
                            if(addSslRule) {
                                const ssl = await pleskClient.addSslCertificate(name)
                                const isSslInstalled = ssl.requestStatus && ssl.stepStatus;

                                await domainHelpers.addLogRecord(domain._id, ssl);   
                                const userMessage = `${ssl.chatMessage} ${isSslInstalled ? '*УСПЕШНО*' : '*НЕУСПЕШНО*'}`;
                                if(isSslInstalled) {
                                    await Domain.updateOne({ _id: domain._id },{ isSslInstalled: true });
                                }
                                await telegram.sendMessage(userMessage, 'dev');
                            }
                        }) 
                }
            } else {
                const errorMessage = register.stepErrorMessage ? register.stepErrorMessage : register.requestErrorMessage;
                return handler.errorMessage(res, `Домен не добавлен, ошибка REG.RU: ${errorMessage}`);
            }
        } else {
            const currentRecords = await dnsUtils.getDomainDetails(name);
            if(!currentRecords.domainExist) return handler.errorMessage(res, 'Такой домен не сущесвует.');

            const isARecordActive = currentRecords.aRecords.includes(ipAdress);
            const currentNsServers = currentRecords.nsRecords;
            
            const domain = new Domain({
                name,
                nsServers: currentNsServers,
                ipAdress,
                webspaceId,
                webspaceName,
                aRecordActive: isARecordActive,
                isPleskInstalled: false,
                isSslInstalled: false,
                creator: userId,
            });
            await domain.save();

             // Install domain on PLESK server
             if(addToServer) {
                pleskClient.addDomain(webspaceId, name)
                    .then(async plesk => {
                        const isPleskInstalled = plesk.requestStatus && plesk.stepStatus;

                        await domainHelpers.addLogRecord(domain._id, plesk);
                        const userMessage = `${plesk.chatMessage} ${isPleskInstalled ? '*УСПЕШНО*' : '*НЕУСПЕШНО*'}`;
                        if(isPleskInstalled) {
                            await Domain.updateOne({ _id: domain._id },{ isPleskInstalled: true, webspaceId: webspaceId, webspaceName: webspaceName, pleskId: plesk.data.id });
                        }
            
                        await telegram.sendMessage(userMessage, 'dev');

                        // Check if need to install SSL certificate
                        const addSslRule = addSsl && isPleskInstalled && isARecordActive;
                        if(addSslRule) {
                            const ssl = await pleskClient.addSslCertificate(name)
                            const isSslInstalled = ssl.requestStatus && ssl.stepStatus;

                            await domainHelpers.addLogRecord(domain._id, ssl);   
                            const userMessage = `${ssl.chatMessage} ${isSslInstalled ? '*УСПЕШНО*' : '*НЕУСПЕШНО*'}`;
                            if(isSslInstalled) {
                                await Domain.updateOne({ _id: domain._id },{ isSslInstalled: true });
                            }
                            await telegram.sendMessage(userMessage, 'dev');
                        }
                    }) 
            }
        }

        await handler.pResponse(res, {
            message: 'Домен добавлен.',
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
}

exports.updateDomain = async (req, res) => {
    const { id } = { ...req.params };
    const { name, ipAdress } = { ...req.body };

    if (!id) return handler.errorMessage(res, 'Domain id cannot be empty!');
    try {
        const deleteAll = await regRuClient.deleteAllRecords(name);
        const addMainRecord = await regRuClient.addDnsRecord(name, '@', ipAdress);
        const addWWWRecord = await regRuClient.addDnsRecord(name, 'www', ipAdress);
        const addAllSubRecord = await regRuClient.addDnsRecord(name, '*', ipAdress);

        // Check that all steps are successfull
        const regRuStatus = 
            deleteAll.stepStatus
            && addMainRecord.stepStatus
            && addWWWRecord.stepStatus
            && addAllSubRecord.stepStatus;

        let updateResult;
        if(regRuStatus) {
            const currentRecords = await dnsUtils.getDomainDetails(name);
            const isARecordActive = currentRecords.aRecords.includes(ipAdress);

            const update = await Domain.updateOne(
                {
                    _id: id
                }, {
                    ipAdress: ipAdress,
                    aRecordActive: isARecordActive
                }
            );

            updateResult = update.nModified === 1 ? true : false;
        }

        await handler.pResponse(res, {
            message: 'Домен обновлен.',
            regRuStatus,
            updateResult
        }, req);
    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.deleteDomain = async (req, res) => {
    const { id } = { ...req.params };
    let isPleskDeleted;
    if (!id) return handler.errorMessage(res, 'Domain id cannot be empty!');

    try {
        const domain = await Domain.findOne({
            _id: id
        });

        if (!domain) return handler.errorMessage(res, 'Такого домена нет в базе.');

        if(domain.isPleskInstalled) {
            const plesk = await pleskClient.deleteDomain(domain.name);
            isPleskDeleted = plesk.requestStatus && plesk.stepStatus;
        } else {
            isPleskDeleted = true
        }

        if(isPleskDeleted) {
            await Domain.deleteOne({
                _id: id
            });
        }

        await handler.pResponse(res, {
            message: 'Домен удален.',
        }, req);

    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.deleteSubDomain = async (req, res) => {
    const { id, subId } = { ...req.params };

    let isPleskDeleted;
    if (!id) return handler.errorMessage(res, 'Domain id cannot be empty!');
    if (!subId) return handler.errorMessage(res, 'Subdomain id cannot be empty!');

    try {
        const domain = await Domain.findOne({
            _id: id,
            'subdomains._id': subId,
        }, { 'subdomains.$': 1, name: 1 });

        if (!domain) return handler.errorMessage(res, 'Такого домена нет в базе.');

        const subDomain = domain.subdomains[0];

        if(subDomain.isPleskInstalled) {
            const deleteSub = await pleskClient.deleteDomain(`${subDomain.name}.${domain.name}`);
            isPleskDeleted = deleteSub.requestStatus && deleteSub.stepStatus;
            await domainHelpers.addLogRecord(domain._id, deleteSub);
        } else {
            isPleskDeleted = true
        }

        if(isPleskDeleted) {
            await Domain.update(
                {
                    _id: id
                }, {
                    $pull: { 'subdomains': { _id: subId } },
                }
            );
        }

        await handler.pResponse(res, {
            message: 'Сабдомен удален.',
            // domain
        }, req);

    } catch(error) {
        logger.error('', error);
        throw error;
    }
};

exports.addSubdomains = async (req, res) => {
    const { id } = { ...req.params };
    const { subdomain, addSsl } = { ...req.body };
    if (!id) return handler.errorMessage(res, 'Domain id cannot be empty!');

    try {
        const domain = await Domain.findOne({
            _id: id
        });
        if (!domain) return handler.errorMessage(res, 'Домена нет в базе');

        const domainName = domain.name;
        const domainIpAdress = domain.ipAdress;
        const nameWithSubdomain = `${subdomain}.${domainName}`;

        const currentRecords = await dnsUtils.getDomainDetails(nameWithSubdomain);
        if(!currentRecords.domainExist) return handler.errorMessage(res, 'Такой домен не сущесвует.');

        const isARecordActive = currentRecords.aRecords.includes(domainIpAdress);
        const createdAt = moment().toISOString();

        await Domain.updateOne(
            { 
                _id: id
            }, {
                $push: { subdomains: {
                    createdAt: createdAt,
                    name: subdomain,
                    aRecordActive: isARecordActive,
                } },
            }
        );

        pleskClient.addSubDomain(domainName, subdomain)
            .then(async plesk => {
                const isPleskInstalled = plesk.requestStatus && plesk.stepStatus;

                await domainHelpers.addLogRecord(id, plesk);
                const userMessage = `${plesk.chatMessage} ${isPleskInstalled ? '*УСПЕШНО*' : '*НЕУСПЕШНО*'}`;
                if(isPleskInstalled) {
                    await Domain.updateOne(
                        { 
                            _id: domain._id,
                            subdomains: { $elemMatch: { name: subdomain.toLowerCase() }}
                        }, { 
                            $set: {
                                'subdomains.$.isPleskInstalled': true
                            } 
                        }
                    );
                }
    
                await telegram.sendMessage(userMessage, 'dev');

                // Check if need to install SSL certificate
                const addSslRule = addSsl && isPleskInstalled && isARecordActive;
                if(addSslRule) {
                    const ssl = await pleskClient.addSslCertificate(nameWithSubdomain)
                    const isSslInstalled = ssl.requestStatus && ssl.stepStatus;

                    await domainHelpers.addLogRecord(id, ssl);   
                    const userMessage = `${ssl.chatMessage} ${isSslInstalled ? '*УСПЕШНО*' : '*НЕУСПЕШНО*'}`;
                    if(isSslInstalled) {
                        await Domain.updateOne(
                            { 
                                _id: domain._id,
                                subdomains: { $elemMatch: { name: subdomain.toLowerCase() }}
                            }, { 
                                $set: {
                                    'subdomains.$.isSslInstalled': true
                                } 
                            }
                        );
                    }
                    await telegram.sendMessage(userMessage, 'dev');
                }
            })
    } catch(error) {
        logger.error('', error);
        throw error;
    }

    await handler.pResponse(res, {
        message: 'Сабдомены добавлены.',
    }, req);
}

exports.generateDomains = async (req, res) => {
    const schema = Joi.object({
        wordCount: Joi.number().required().min(1).max(4).strict(),
        quantity: Joi.number().required().min(1).strict(),
        separator: Joi.string().required().allow('').strict(),
        keywords: Joi.array().required(),
        tlds: Joi.array().required().min(1),
        isPrefixEnabled: Joi.boolean(),
        prefixType: Joi.string().valid('string', 'number', 'mixed').allow(null).strict(),
        prefixLength: Joi.number().allow(null).strict(),
        isSuffixEnabled: Joi.boolean(),
        suffixType: Joi.string().valid('string', 'number', 'mixed').allow(null).strict(),
        suffixLength: Joi.number().allow(null).strict()
    });
    const { error, value } = schema.validate(req.body, joiOptions);
    
    if(error) {
        const messages = error.details.map(e => e.message)
        return handler.errorMessage(res, messages);
    }

    const {
        keywords,
        tlds,
        wordCount,
        quantity,
        separator,
        isPrefixEnabled,
        prefixType,
        prefixLength,
        isSuffixEnabled,
        suffixType,
        suffixLength
    } = { ...value };

    try {
        const domains = await generatorUtils.generateNames(keywords,
            tlds,
            wordCount,
            quantity,
            separator,
            isPrefixEnabled,
            prefixType,
            prefixLength,
            isSuffixEnabled,
            suffixType,
            suffixLength
        );

        return handler.pResponse(res, {
            message: 'Domains list',
            domains: domains
        }, req);
    } catch (error) {
        logger.error('', error);
        throw error;
    }
};

exports.getTlds = async (req, res) => {
    const entity = 'tlds';
    try {
        const tlds = await Config.findOne({
            entity
        });

        return handler.pResponse(res, {
            message: 'TLDs list',
            tlds: tlds.values
        }, req);
    } catch(error) {
        logger.error('', error);
        throw error;
    }
}