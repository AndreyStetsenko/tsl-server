
var mongoose = require('mongoose');

var jobsSchema = mongoose.Schema({
    name: {
        type: String, 
        required: true, 
        trim: true
    },
    start: {
        type: Date
    },
    end: {
        type: Date
    },
    status: {
        type: Boolean
    },
    stepsStatus: {
        type: Array
    },
    errorMessage: {
        type: String, 
    },
    errorStack: {
        type: String, 
    }

}, {timestamps: true});

module.exports = mongoose.model("jobs", jobsSchema);
