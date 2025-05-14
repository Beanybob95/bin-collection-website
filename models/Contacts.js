const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContactsSchema = new Schema({
    uprn: String,
    email: String,
    firstname: String,
    lastname: String,
});

module.exports = mongoose.model('Contacts', ContactsSchema);
