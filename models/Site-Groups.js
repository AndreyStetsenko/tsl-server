
var mongoose = require('mongoose');

var schema = mongoose.Schema({
    groupName: {
        type: String, 
        required: true, 
        lowercase: true,
        trim: true
    },
    subgroupName: {
        type: String, 
        required: true, 
        lowercase: true,
        trim: true
    },
    plug: {
        type: String,
        required: true, 
        lowercase: true,
        trim: true
    },
    aPlug: {
        type: String,
        lowercase: true,
        trim: true
    },
    type: {
        type: String, 
        required: true, 
        lowercase: true,
        trim: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("site-groups", schema);
