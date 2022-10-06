const trashRules = [
    {    
        firstName: {
            check: true,
            test: true,
        },
        lastName: {
            check: true,
            test: true,
        },
        email: {
            check: true,
            duplicated: true,
            test: true
        },
        phone: {
            check: true,
            duplicated: true,
        },
        country: {
            check: true,
            ua: true
        }
    }, {
        firstName: {
            check: true,
            test: true, //!fix
        },
        lastName: {
            check: true,
            test: true, //!fix
        },
        email: {
            check: false,
            duplicated: false,
            test: false,
        },
        phone: {
            check: true,
            duplicated: true,
        },
        country: {
            check: false,
            ua: false
        }
    }
];

const validationRules = [
    {
        creator: {
            check: true,
            isempty: true,
            valid: true,
            exist: true,
        },
        flowId: {
            check: true,
            isempty: true,
            valid: true,
            exist: true,
        },
        flowIdWithoutCreator: {
            check: false,
            isempty: false,
            valid: false,
            exist: false,
        },
        offerId: {
            check: false,
            isempty: false,
            valid: false,
            exist: false,
        },
        firstName: {
            check: true,
            isempty: true,
        },
        lastName: {
            check: true,
            isempty: true,
        },
        email: {
            check: true,
            isempty: true,
        },
        phone: {
            check: true,
            isempty: true,
        },
        country: {
            check: true,
            isempty: true,
            inlist: true,
        },
        language: {
            check: true,
            isempty: true,
            inlist: true,
        },
        landing: {
            check: true,
            isempty: true,
            group: false
        },
        landingGroup: {
            check: true,
            isempty: true,
            exist: true
        },
    }, {
        creator: {
            check: true,
            isempty: true,
            valid: true,
            exist: true,
        },
        flowId: {
            check: false,
            isempty: false,
            valid: false,
            exist: false,
        },
        flowIdWithoutCreator: {
            check: false,
            isempty: false,
            valid: false,
            exist: false,
        },
        offerId: {
            check: true,
            isempty: true,
            valid: true,
            exist: true,
        },
        firstName: {
            check: true,
            isempty: true,
        },
        lastName: {
            check: true,
            isempty: true,
        },
        email: {
            check: false,
            isempty: false,
        },
        phone: {
            check: true,
            isempty: true,
        },
        country: {
            check: true,
            isempty: true,
            inlist: true,
        },
        language: {
            check: false,
            isempty: false,
            inlist: false,
        },
        landing: {
            check: true,
            isempty: true,
            group: false
        },
        landingGroup: {
            check: false,
            isempty: false,
            exist: false
        },
    }, {
        creator: {
            check: false,
            isempty: false,
            valid: false,
            exist: false,
        },
        flowId: {
            check: false,
            isempty: false,
            valid: false,
            exist: false,
        },
        flowIdWithoutCreator: {
            check: true,
            isempty: true,
            valid: true,
            exist: true,
        },
        offerId: {
            check: true,
            isempty: true,
            valid: true,
            exist: true,
        },
        firstName: {
            check: false,
            isempty: false,
        },
        lastName: {
            check: false,
            isempty: false,
        },
        email: {
            check: false,
            isempty: false,
        },
        phone: {
            check: false,
            isempty: false,
        },
        country: {
            check: false,
            isempty: false,
            inlist: false,
        },
        language: {
            check: false,
            isempty: false,
            inlist: false,
        },
        landing: {
            check: true,
            isempty: true,
            group: false
        },
        landingGroup: {
            check: false,
            isempty: false,
            exist: false
        },
    },
];

exports.getOfferTrashRules = (ruleId) => {
    if (trashRules[ruleId]) {
        return trashRules[ruleId];
    } else {
        throw new Error('Trash rule not found');
    }
};

exports.getOfferValidationRules = (ruleId) => {
    if (validationRules[ruleId]) {
        return validationRules[ruleId];
    } else {
        throw new Error('Validation rule not found');
    }
};
