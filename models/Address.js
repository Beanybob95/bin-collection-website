const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { getCollectionDatesThisYear } = require('../services/binCollectionDatesService');
const dbDebug = require('debug')('app:db');


const AddressSchema = new Schema({
    uprn:        { type: String, required: true, trim: true, maxLength: 12, unique: true },
    postcode:    { type: String, required: true, trim: true, maxLength: 8 },
    housenumber: { type: String, required: true, trim: true, maxLength: 20 },
    roadname:    { type: String, required: true, trim: true, maxLength: 100 },
    county:      { type: String, required: true, trim: true, maxLength: 100 },
});


AddressSchema.post('save', async function(doc) {
    dbDebug('A new address was saved: ', doc);
     await getCollectionDatesThisYear(doc.postcode,doc.uprn)
});

module.exports = mongoose.model('Address', AddressSchema);
