const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {
    getCollectionDatesThisYear,
} = require('../services/binCollectionDatesService');
const dbDebug = require('debug')('app:db');

const AddressSchema = new Schema({
    // UPRN (Unique Property Reference Number) is a nationwide unique identifier
    // for every addressable property in the UK, so one Address document is shared
    // across all users who live there rather than duplicating the record per user.
    uprn: {
        type: String,
        required: true,
        trim: true,
        maxLength: 12,
        unique: true,
    },
    postcode: { type: String, required: true, trim: true, maxLength: 8 },
    housenumber: { type: String, required: true, trim: true, maxLength: 20 },
    roadname: { type: String, required: true, trim: true, maxLength: 100 },
    county: { type: String, required: true, trim: true, maxLength: 100 },
    lastRefresh: { type: Date, default: Date.now },
});

// Eagerly populate bin collection dates when an address is first saved so the
// user sees data immediately on the next page without a separate manual refresh.
AddressSchema.post('save', async function (doc) {
    dbDebug('A new address was saved: ', doc);
    await getCollectionDatesThisYear(doc.postcode, doc.uprn);
});

module.exports = mongoose.model('Address', AddressSchema);
