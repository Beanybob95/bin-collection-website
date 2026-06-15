const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const BinCollectionDatesSchema = new Schema({
    date:        { type: Date, required: true },
    type:        { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    uprn:        { type: String, required: true, trim: true, index: true },
});

module.exports = mongoose.model('BinCollectionDates', BinCollectionDatesSchema);
