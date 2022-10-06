var mongoose = require('mongoose');

var schema = mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
    },
    status: {
        type: Number,
    },
    data: {
        type: Object,
    },
    errorType: {
        type: String,
        trim: true
    },
    errorMessage: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model("lead-send-logs", schema);
