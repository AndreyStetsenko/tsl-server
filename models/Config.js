
var mongoose = require('mongoose');

var schema = mongoose.Schema({
    entity: {
        type: String, 
        required: true, 
        lowercase: true,
        trim: true
    },
    values: {
        type: Array
    },
}, { timestamps: true });

module.exports = mongoose.model("configs", schema);
