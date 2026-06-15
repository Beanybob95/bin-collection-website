const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactsSchema = new Schema({
    uprn:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'] },
    firstname: { type: String, required: true, trim: true, maxLength: 50 },
    lastname:  { type: String, required: true, trim: true, maxLength: 50 },
});

module.exports = mongoose.model('Contacts', ContactsSchema);
