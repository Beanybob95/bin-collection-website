const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AddressSchema = new Schema({
    uprn: String,
    postcode: String,
    housenumber: Number,
    roadname: String,
    county: String
});

module.exports = mongoose.model('Address', AddressSchema);
