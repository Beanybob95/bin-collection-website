const Address = require('../models/Address');
const BinCollectionDates = require('../models/BinCollectionDates');
const User = require('../models/User');
const {
    getCollectionDatesThisYear,
} = require('../services/binCollectionDatesService');
const dbDebug = require('debug')('app:db');

const typeLabels = {
    res: 'Household waste',
    pod: 'Recycling & Glass',
    cgw: 'Garden waste',
};
const defaultTypeLabel = 'Other collection';

module.exports.show = async (req, res, next) => {
    try {
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
        const binCollections = await BinCollectionDates.find({
            uprn: address.uprn,
        });

        dbDebug(address);
        dbDebug(binCollections);

        const today = new Date();
        // Zero out the time so that a collection scheduled for today isn't
        // excluded because the comparison time has already passed.
        today.setHours(0, 0, 0, 0);

        // Each collection event is a separate document, so types repeat across documents.
        // Set gives us the unique bin types for this address without a separate DB query.
        const types = [...new Set(binCollections.map((c) => c.type))];
        const nextCollections = types
            .map((type) => {
                const nextDate = binCollections
                    .filter((c) => c.type === type && c.date >= today)
                    .map((c) => c.date)
                    .sort((a, b) => a - b)[0];
                return nextDate
                    ? {
                          type,
                          label: typeLabels[type] || defaultTypeLabel,
                          date: nextDate,
                      }
                    : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.date - b.date);

        res.render('bin-collections/show', {
            title: 'Collection Dates',
            address,
            binCollections,
            nextCollections,
        });
    } catch (err) {
        next(err);
    }
};

module.exports.refresh = async (req, res, next) => {
    try {
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

        const COOLDOWN_MS = 60 * 60 * 1000;
        if (address.lastRefresh && Date.now() - address.lastRefresh < COOLDOWN_MS) {
            return res.redirect(`/bincollection/${req.params.id}`);
        }

        await getCollectionDatesThisYear(address.postcode, address.uprn, address._id);

        res.redirect(`/bincollection/${req.params.id}`);
    } catch (err) {
        next(err);
    }
};
