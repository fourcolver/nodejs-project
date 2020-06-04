var mongoose = require('mongoose');

var bandSchema = mongoose.Schema({
    email: String,
    bandtype: String,
    name: String,
    status: {type: Boolean, default: false}
});

module.exports = mongoose.model('member', bandSchema);
