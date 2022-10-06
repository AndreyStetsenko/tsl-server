
var mongoose = require('mongoose');

var offerSchema = mongoose.Schema({
    name: {
        type: String, 
        required: true, 
        trim: true
    },
    externalId: {
        type: String, 
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    url: {
        type: String,
        default: ''
    },
    offerChartColor: {
        type: String,
    },
    advertisers: [{
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        internalId: String,
        caps: {
            set: {
                type: Number,
                default: 0
            },
            current: {
                type: Number,
                default: 0
            }
        },
        countries: {
            type: Array,
            required: true, 
            default: []
        },
        domains: {
            type: Array,
            default: []
        },
        landingGroups: [{
            name: String,
            set: {
                type: Number,
                default: 0
            },
            current: {
                type: Number,
                default: 0
            },
            isActive: {
                type: Boolean,
                default: false
            },
        }],
        callCenterWork: {
            type: String,
            default: ''
        },
        isPaused: {
            type: Boolean,
            default: false, 
        },
        isRedirectAvailable: {
            type: Boolean
        },
        isCapsAvailable: {
            type: Boolean
        },
        project: {
            type: String,
        }
    }],
    categories: {
        type: Object,
        required: true
    },
    isMultiGeoActive: {
        type: Boolean
    },
    geoDetails: [{
        country: String,
        externalId: String,
    }]
}, {timestamps: true});

module.exports = mongoose.model("offers", offerSchema);
