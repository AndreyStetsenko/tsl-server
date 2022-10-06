var mongoose = require('mongoose');

var schema = mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("lead-logs", schema);
