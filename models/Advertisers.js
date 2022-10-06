
var mongoose = require('mongoose');

var advertiserSchema = mongoose.Schema({
    internalId: {
        type: String, 
        required: true, 
        trim: true
    },
    name: {
        type: String, 
        required: true, 
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        default: ''
    },
    countries: {
        type: Array,
        required: true, 
        default: []
    },
    landingGroups: {
        type: Array,
        default: []
    },
    domains: {
        type: Array,
        default: []
    },
    callCenterWork: {
        type: String,
        default: ''
    },
    isIntegrated: {
        type: Boolean,
        required: true, 
        default: false
    },
    isRedirectAvailable: {
        type: Boolean,
        required: true, 
        default: false
    },
    isCapsAvailable: {
        type: Boolean,
        required: true, 
        default: false
    },
    project: {
        type: String,
    },
    sendDataType: {
        type: String, 
        required: true, 
        enum : [
            'landing-group',
            'landing-subgroup',
            'plug-only-tsl',
            'plug-only-abc',
            'plug-affiliate-tsl',
            'plug-affiliate-abc',
            'real-url',
            'default'
        ],
    },
    defaultSendData: {
        type: String, 
        trim: true
    },
    endpointSendLead: {
        type: String, 
        required: true, 
        trim: true
    },
    apiParameters: {
        type: Array,
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model("advertisers", advertiserSchema);
