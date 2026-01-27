const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCollectionDatesThisYear } = require('../services/binCollectionDatesService');


const AddressSchema = new Schema({
    uprn: String,
    postcode: String,
    housenumber: String,
    roadname: String,
    county: String
});


AddressSchema.post('save', function(doc) {
    console.log('A new address was saved:', doc);
    getCollectionDatesThisYear(doc.postcode,doc.uprn)
});

/*AddressSchema.post('create', function(doc) {
    console.log('A new address was created:', doc);
    getCollectionDatesThisYear(doc.postcode, doc.uprn);
});*/



module.exports = mongoose.model('Address', AddressSchema);
