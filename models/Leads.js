var mongoose = require('mongoose');

var leadSchema = mongoose.Schema({
    firstName: {
        type: String, 
        trim: true
    },
    lastName: {
        type: String, 
        trim: false
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String, 
        trim: true
    },
    country: {
        type: String,
        trim: true,
        uppercase: true
    },
    town: {
        type: String,
        trim: true
    },
    language: {
        type: String,
        trim: true,
        uppercase: true
    },
    ip: {
        type: String,
        trim: true
    },
    landing: {
        type: String,
        trim: true,
        // lowercase: true
    },
    prelanding: {
        type: String,
        trim: true,
        // lowercase: true
    },
    landingGroup: {
        type: String,
        trim: true,
        uppercase: true
    },
    prelandingGroup: {
        type: String,
        trim: true,
        uppercase: true
    },
    landingGroupName: {
        type: String,
        trim: true,
        lowercase: true
    },
    advertiser: {
        type: mongoose.Schema.Types.ObjectId,
    },
    flowId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    status: {
        type: String,
        trim: true,
        uppercase: true
    },
    partnerStatus: {
        type: String,
        trim: true,
        uppercase: true
    },
    partnerId: {
        type: String,
        trim: true,
    },
    onSendCheck: {
        type: Array,
        default: []
    },
    clickid: {
        type: String,
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    offerExternalId: {
        type: String,
    },
    offerCategoryId: {
        type: String
        // default: null
    },
    partnerRedirectUrl: {
        type: String
    },
    validationErrors: {
        type: Array,
        default: []
    },
    responseStatus: {
        type: String
    },
    response: {
        type: String
    },
    formattedPartnerError: {
        type: String
    },
    sendDate: {
        type: Date
    },
    isSending: {
        type: Boolean,
        default: false
    },
    capJobId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    logs: {
        type: Array
    },
    cloakCampaignName: {
        type: String
    },
    advertiserLeadId: {
        type: String
    },
    deposit: {
        type: String
    },
    fbclid: {
        type: String
    },
    fbpixel: {
        type: String
    },
    trackerId: {
        type: String
    },
    sub1: {
        type: String,
        trim: true
    },
    sub2: {
        type: String,
        trim: true
    },
    sub3: {
        type: String,
        trim: true
    },
    sub4: {
        type: String,
        trim: true
    },
    sub5: {
        type: String,
        trim: true
    },
    sub6: {
        type: String,
        trim: true
    },
    sub7: {
        type: String,
        trim: true
    },
    sub8: {
        type: String,
        trim: true
    },
    sub9: {
        type: String,
        trim: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true
    },
    project: {
        type: String,
        default: null
    },
    sendBody: {
        type: Object,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("leads", leadSchema);
