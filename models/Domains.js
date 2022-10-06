
var mongoose = require('mongoose');

var schema = mongoose.Schema({
    name: {
        type: String, 
        required: true, 
        lowercase: true,
        trim: true
    },
    nsServers: {
        type: Array,
        default: []
    },
    ipAdress: {
        type: String,
        // required: true, 
        trim: true
    },
    webspaceId: {
        type: Number,
        // required: true, 
        trim: true
    },
    webspaceName: {
        type: String,
        // required: true, 
        trim: true
    },
    pleskId: {
        type: Number,
        // required: true, 
        trim: true
    },
    subdomains: [{
        createdAt: {
            type: Date
        },
        name: {
            type: String,
            lowercase: true,
            trim: true
        },
        pleskId: {
            type: Number
        },
        aRecordActive: {
            type: Boolean,
            default: false
        },
        isPleskInstalled: {
            type: Boolean,
            default: false
        },
        isSslInstalled: {
            type: Boolean,
            default: false
        },
    }],
    aRecordActive: {
        type: Boolean,
        // required: true,
        default: false
    },
    isPleskInstalled: {
        type: Boolean
    },
    isSslInstalled: {
        type: Boolean
    },
    logs: {
        type: Array
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("domains", schema);
