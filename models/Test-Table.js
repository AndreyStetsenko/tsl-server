
const mongoose = require('mongoose');

const schema = mongoose.Schema({
    date: Date,
    offers:[{
        _id: mongoose.Schema.Types.ObjectId,
        advertisers: [{
            _id: mongoose.Schema.Types.ObjectId,
            caps: {
                set: Number,
                current: Number,
            }
        }]
    }]
}, {timestamps: true});

module.exports = mongoose.model("test-tables", schema);
