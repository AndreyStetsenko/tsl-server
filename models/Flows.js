
var mongoose = require('mongoose');

var flowSchema = mongoose.Schema({
    externalId: {
        type: String, 
        required: true, 
        trim: true
    },
    name: {
        type: String, 
        required: true, 
        trim: true
    },
    offer: {
        type: Object,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("flows", flowSchema);
