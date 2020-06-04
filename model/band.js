var mongoose = require('mongoose');
const invoice = require("../util/invoice");
const contract = require("../util/contract");

var bandSchema = mongoose.Schema({
    name: String,
    lastInvoiceNumber: {type:Number, default: 1},
    invoice: Object,
    contract: Object
});

module.exports = mongoose.model('band', bandSchema);
