
var mongoose = require('mongoose');

var schema = mongoose.Schema({
    name: {
        type: String, 
        required: true, 
        trim: true,
        enum : [
            'Administrator',
            'Affiliate',
            'Teamlead'
        ],
    },
    slug: {
        type: String, 
        required: true, 
        trim: true,
        lowercase: true,
        enum : [
            'admin',
            'affiliate',
            'teamlead'
        ],
    },
    permissions: [{
        name: {
            type: String, 
            required: true, 
            trim: true
        },
        slug: {
            type: String, 
            required: true, 
            trim: true
        }
    }],
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("roles", schema);
