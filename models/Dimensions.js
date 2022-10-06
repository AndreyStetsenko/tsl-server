
var mongoose = require('mongoose');

var schema = mongoose.Schema({
    // dates: {
    //     type: Array
    // },
    dates: [Date]
});

module.exports = mongoose.model("dimensions", schema);
