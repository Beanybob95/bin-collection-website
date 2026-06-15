const mongoose = require('mongoose');
const Address = require('../models/Address');
const Contacts = require('../models/Contacts');
const BinCollectionDates = require('../models/BinCollectionDates');
const dbDebug = require('debug')('app:db');

module.exports.index = async (req, res) => {
    const addresses = await Address.find({});
    dbDebug(addresses);
    res.render('addresses/index', {
        title: 'Addresses',
        addresses
    });
};

module.exports.newForm = async (req, res) => {
    const referer = req.get('Referer');

    res.render('addresses/new', {
        title: 'New Address',
        backLink: referer || '/addresses'
    });
};

module.exports.show = async (req, res) => {
    const address = await Address.findById(req.params.id);
    if (!address) {
        return res.status(404).send('Address not found');
    }
    const contacts = await Contacts.find({ uprns: address.uprn });
    dbDebug(address);
    dbDebug(contacts);

    res.render('addresses/show', {
        title: 'Address Details',
        address,
        contacts
    });
};

module.exports.create = async (req, res) => {
    try {
        const { uprn, postcode, housenumber, roadname, county } = req.body;
        let address = await Address.findOne({ uprn });

        if (address) {
            return res.redirect('/addresses');
        }

        const newAddress = new Address({
            uprn,
            postcode,
            housenumber,
            roadname,
            county
        });

        await newAddress.save();
        res.redirect('/addresses');
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).send(error.message);
        }
        dbDebug('Error saving address: ', error);
        res.status(500).send('Error saving address');
    }
};

module.exports.destroy = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const address = await Address.findById(req.params.id).session(session);

        if (!address) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).send('Address not found');
        }

        await Contacts.updateMany({ uprns: address.uprn }, { $pull: { uprns: address.uprn } }, { session });
        const deletedContacts = await Contacts.deleteMany({ uprns: { $size: 0 } }, { session });

        const deletedCollections = await BinCollectionDates.deleteMany(
            { uprn: address.uprn },
            { session }
        );

        const deletedAddress = await Address.findByIdAndDelete(req.params.id, { session });

        dbDebug(deletedContacts);
        dbDebug(deletedCollections);
        dbDebug(deletedAddress);

        await session.commitTransaction();
        session.endSession();

        res.redirect('/addresses');
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        dbDebug('Error deleting address: ', error);
        res.status(500).send('Error deleting address');
    }
};


module.exports.newContactForm = async (req, res) => {
    const address = await Address.findById(req.params.id);
    dbDebug(address);

    res.render('addresses/contacts-new', {
        title: 'New Contact',
        address
    });
};

module.exports.createContact = async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            dbDebug('Address not found');
            return res.status(404).send('Address not found');
        }

        const { firstname, lastname, email } = req.body;

        await Contacts.findOneAndUpdate(
            { email },
            { $addToSet: { uprns: address.uprn }, $setOnInsert: { firstname, lastname, email } },
            { upsert: true, new: true }
        );

        res.redirect(`/addresses/${address._id}`);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).send(error.message);
        }
        dbDebug('Error saving contact: ', error);
        res.status(500).send('Error saving contact');
    }
};

module.exports.destroyContact = async (req, res) => {
    try {
        const contact = await Contacts.findByIdAndDelete(req.params.contactId);
        dbDebug(contact);

        const referer = req.get('Referer');
        res.redirect(referer || '/addresses');
    } catch (error) {
        dbDebug('Error deleting contact: ', error);
        res.status(500).send('Error deleting contact');
    }
};