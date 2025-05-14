const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AddressSchema = new Schema({
    uprn: String,
    postcode: String,
    housenumber: String,
    roadname: String,
    county: String,
    emailnotifications: Boolean
});

module.exports = mongoose.model('Address', AddressSchema);
