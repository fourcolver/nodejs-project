var mongoose = require('mongoose');

const addressSchema = {
    streetAndHouseNumber: String,
    zipCode: String,
    city: String,
    country: String
};
const contactSchema = {
    name: String,
    phone: String,
    email: String,
    website: String,
    address: addressSchema
};
var eventSchema = mongoose.Schema({
    status: String,
    date: Date,
    showtimeStart: String,
    showtimeEnd: String,
    pax: Number,
    name: String,
    location: String,
    address: addressSchema,
    type: String,
    soundAndLightProvider: String,
    miscellaneous: String,
    price: Number,
    contractingParty: contactSchema,
    poster: String,
    assistants: String,
    eventContact: contactSchema,
    differentBillingAddress: Boolean,
    billingContact: contactSchema,
    bandtype: String,
    version: {type: Number, default: 0},
    created: Date,
    modified: Date,
    modifierID: String
});

module.exports = mongoose.model('event', eventSchema);
