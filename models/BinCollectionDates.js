const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const BinCollectionDatesSchema = new Schema({
    date: Date,
    type: String,
    description: String,
    uprn: String
});

module.exports = mongoose.model('BinCollectionDates', BinCollectionDatesSchema);
