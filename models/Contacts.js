const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactsSchema = new Schema({
    uprns:     [{ type: String, trim: true, index: true }],
    email:     { type: String, required: true, unique: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'] },
    firstname: { type: String, required: true, trim: true, maxLength: 50 },
    lastname:  { type: String, required: true, trim: true, maxLength: 50 },
});

module.exports = mongoose.model('Contacts', ContactsSchema);
