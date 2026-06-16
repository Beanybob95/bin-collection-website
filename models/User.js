const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    firstname: { type: String, required: true, trim: true, maxLength: 50 },
    lastname: { type: String, required: true, trim: true, maxLength: 50 },
    addresses: [{ type: Schema.Types.ObjectId, ref: 'Address', index: true }],
});

module.exports = mongoose.model('User', UserSchema);
