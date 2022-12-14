const _ = require('underscore');
const miscHelpers = require('../helpers/misc');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const Lead = require('../models/Leads');

exports.getUniquePartners = async () => {
    const partners = await Lead.distinct( "partner" );
    return partners;
}

exports.fillObjectWithPartners = async (filledObject, arrayToFill, propertyName, matchValue) => {
    if (!_.isEmpty(filledObject)) {
        arrayToFill.forEach(value => {
            const check = filledObject.aggregation.some(aData => {
                if(aData[matchValue]) {
                    return aData[matchValue].toString() == value;
                }
                
            });
            if(!check) {
                filledObject.aggregation.push({
                    [matchValue]: value,
                    [propertyName]: 0
                })
            }
        });
    } else {
        filledObject.total = 0;
        filledObject.aggregation = [];
        arrayToFill.forEach(value => {
            filledObject.aggregation.push({
                [matchValue]: value,
                [propertyName]: 0
            })
        })
    }
};

exports.fillArrayWithEmptyValues = async (objectToMutate, arrayWithAllValues, mutatePropertyName, joinValue, arraWithValuesNameColumn) => {
    if (!_.isEmpty(objectToMutate)) {
        arrayWithAllValues.forEach(value => {
            const check = objectToMutate.aggregation.some(aData => {
                if(aData[joinValue]) {
                    return aData[joinValue].equals(value._id)
                }
                
            });
            if(!check) {
                objectToMutate.aggregation.push({
                    [joinValue]: value._id,
                    name: value[arraWithValuesNameColumn],
                    [mutatePropertyName]: 0
                })
            } else {
                objectToMutate.aggregation.map(objData => {
                    if(objData[joinValue]) {
                        if(objData[joinValue].equals(value._id)) {
                            objData.name = value[arraWithValuesNameColumn];
                        } 
                    } else {
                        objData.name = 'EMPTY';
                    }
                })
            }
        });
    } else {
        objectToMutate.total = 0;
        objectToMutate.aggregation = [];
        arrayWithAllValues.forEach(value => {
            objectToMutate.aggregation.push({
                [joinValue]: value._id,
                name: value[arraWithValuesNameColumn],
                [mutatePropertyName]: 0
            })
        })
    }
};

exports.prepareMongoFilter = (filterObject) => {
    mongoFilter = {
        $or: []
    };

    for (var propName in filterObject) {
        const mongoColumnName = filterObject[propName].mongoName;
        if (filterObject[propName].filterType === 'arrayId') {
            const ids = [];
            filterObject[propName].value.forEach(v => ids.push(ObjectId(v)))
            mongoFilter[mongoColumnName] = { $in: ids }
        }
        else if (filterObject[propName].filterType === 'array') {
            mongoFilter[mongoColumnName] = { $in: filterObject[propName].value }
        }
         else if (filterObject[propName].filterType === 'arrayNull') {
            if(filterObject[propName].value != 'ALL') {
                mongoFilter[mongoColumnName] = { $in: [ filterObject[propName].value, null ] }
            }
        }
        else if (filterObject[propName].filterType === 'arrayOr') {
            // test.push({
            //     [mongoFilter[mongoColumnName]]: filterObject[propName].value
            // })
            // console.log(test)
            // mongoFilter.$or = [];
            // mongoFilter.$or = [].push{test: 'a'}
            // $or = [].push({
            //     [mongoFilter[mongoColumnName]]: filterObject[propName].value
            // })
            // mongoFilter[mongoColumnName] = {
            //     $or: filterObject[propName].value
            // }
        } else if (filterObject[propName].filterType === 'string') {
            mongoFilter[mongoColumnName] = new RegExp(filterObject[propName].value, 'i'); 
        } else if (filterObject[propName].filterType === 'id') {
            if(filterObject[propName].value === 'null') {
                mongoFilter[mongoColumnName] = null; 
            } else {
                mongoFilter[mongoColumnName] = filterObject[propName].value; 
            }
        } else if (filterObject[propName].filterType === 'boolean') {
            mongoFilter[mongoColumnName] = filterObject[propName].value
        } else if (filterObject[propName].filterType === 'dateFrom') {
            const startDate = miscHelpers.returnStartDateWithUTC(filterObject[propName].parsedValue);
            mongoFilter[mongoColumnName] = {
                $gte: startDate
            }
        } else if (filterObject[propName].filterType === 'dateTo') {
            const endDate = miscHelpers.returnEndDateWithUTC(filterObject[propName].parsedValue);
            if (mongoFilter.hasOwnProperty(mongoColumnName)) {
                mongoFilter[mongoColumnName].$lte = endDate;
            } else {
                mongoFilter[mongoColumnName] = {
                    $lte: endDate
                }
            }
        }
    }
    if(mongoFilter.$or.length === 0) delete mongoFilter.$or;
    
    return mongoFilter;
};

exports.getLeadStatusGroupFilter = (group, filterObject) => {
    const updatedFilterObject = Object.assign({}, filterObject);
  
    const groupFilter = {
      all: { },
      hold: { status: "????????" },
      send: { status: "????????????????????????" },
      notsend: { status: "???? ????????????????????????" },
      valid: { status: "????????????????" },
      notvalid: { status: { $in: ["???? ????????????????", "???????????? ????????????"] } },
      trash: { status: { $in: ["????????", "????????????????", "??????"] } }
    };
  
    if (!groupFilter[group]) {
      throw new Error("No such group");
    } else {
      updatedFilterObject.status = groupFilter[group].status;
    }
  
    return updatedFilterObject;
  }

exports.getLeadPartnerStatusGroupFilter = (group, filterObject) => {
    const updatedFilterObject = Object.assign({}, filterObject);
  
    const groupFilter = {
        all: { partnerStatus: { $exists: true } },
        new: { partnerStatus: '??????????' },
        callback: { partnerStatus: '????????????????' },
        missed: { partnerStatus: '????????????????' },
        confirmed: { partnerStatus: '??????????????????????' },
        invalid: { partnerStatus: '??????????????' },
        cancel: { partnerStatus: '????????????' },
        trash: { partnerStatus: '????????' },
        double: { partnerStatus: '??????????' },
    };
  
    if (!groupFilter[group]) {
      throw new Error("No such group");
    } else {
      updatedFilterObject.partnerStatus = groupFilter[group].partnerStatus;
    }
  
    return updatedFilterObject;
}
