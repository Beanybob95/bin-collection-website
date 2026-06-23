const Address = require('../models/Address');
const User = require('../models/User');
const dbDebug = require('debug')('app:db');

module.exports.index = async (req, res) => {
    const user = await User.findById(req.session.userId).populate(
        'addresses'
    );
    dbDebug(user.addresses);
    res.render('addresses/index', {
        title: 'Addresses',
        addresses: user.addresses,
    });
};

module.exports.newForm = async (req, res) => {
    const referer = req.get('Referer');

    res.render('addresses/new', {
        title: 'New Address',
        backLink: referer || '/addresses',
    });
};

module.exports.show = async (req, res) => {
    // Authorization check: confirm this address belongs to the current user
    // before fetching address details to avoid exposing other users' data.
    // Returns 404 rather than 403 to avoid confirming that the address exists.
    const linked = await User.findOne({
        _id: req.session.userId,
        addresses: req.params.id,
    });
    if (!linked) {
        return res.status(404).send('Address not found');
    }

    const address = await Address.findById(req.params.id);
    if (!address) {
        return res.status(404).send('Address not found');
    }
    const users = await User.find({ addresses: address._id });
    dbDebug(address);
    dbDebug(users);

    res.render('addresses/show', {
        title: 'Address Details',
        address,
        users,
        currentUserId: req.session.userId,
    });
};

module.exports.create = async (req, res) => {
    try {
        const { uprn, postcode, housenumber, roadname, county } = req.body;
        let address = await Address.findOne({ uprn });

        if (!address) {
            address = new Address({
                uprn,
                postcode,
                housenumber,
                roadname,
                county,
            });

            await address.save();
        }

        // $addToSet prevents duplicate entries if the user submits the same address twice.
        await User.findByIdAndUpdate(req.session.userId, {
            $addToSet: { addresses: address._id },
        });

        res.redirect('/addresses');
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).send(error.message);
        }
        dbDebug('Error saving address: ', error);
        res.status(500).send('Error saving address');
    }
};

module.exports.newUserForm = async (req, res) => {
    const linked = await User.findOne({
        _id: req.session.userId,
        addresses: req.params.id,
    });
    if (!linked) {
        return res.status(404).send('Address not found');
    }

    const address = await Address.findById(req.params.id);
    dbDebug(address);

    res.render('addresses/users-new', {
        title: 'Add a user',
        address,
        error: null,
    });
};

module.exports.addUser = async (req, res) => {
    const linked = await User.findOne({
        _id: req.session.userId,
        addresses: req.params.id,
    });
    if (!linked) {
        return res.status(404).send('Address not found');
    }

    const address = await Address.findById(req.params.id);
    const { email } = req.body;

    try {
        // Defensive normalisation: email from req.body could be undefined if the
        // field was missing from the form submission, so fall back to '' to avoid
        // calling .toLowerCase() on undefined.
        const userToAdd = await User.findOne({
            email: (email || '').toLowerCase().trim(),
        });

        if (!userToAdd) {
            return res.status(400).render('addresses/users-new', {
                title: 'Add a user',
                address,
                error:
                    'No account found with that email. Ask them to sign up first.',
            });
        }

        await User.findByIdAndUpdate(userToAdd._id, {
            $addToSet: { addresses: address._id },
        });

        res.redirect(`/addresses/${address._id}`);
    } catch (error) {
        dbDebug('Error adding user to address: ', error);
        res.status(500).send('Error adding user to address');
    }
};

module.exports.removeUser = async (req, res) => {
    const linked = await User.findOne({
        _id: req.session.userId,
        addresses: req.params.id,
    });
    if (!linked) {
        return res.status(404).send('Address not found');
    }

    try {
        await User.findByIdAndUpdate(req.params.userId, {
            $pull: { addresses: req.params.id },
        });

        if (req.params.userId === req.session.userId) {
            return res.redirect('/addresses');
        }

        res.redirect(`/addresses/${req.params.id}`);
    } catch (error) {
        dbDebug('Error removing user from address: ', error);
        res.status(500).send('Error removing user from address');
    }
};
