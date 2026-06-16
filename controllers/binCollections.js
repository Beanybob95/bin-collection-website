const Address = require('../models/Address');
const BinCollectionDates = require('../models/BinCollectionDates');
const dbDebug = require('debug')('app:db');

const typeLabels = {
    res: 'Household waste',
    pod: 'Recycling & Glass',
    cgw: 'Garden waste',
};
const defaultTypeLabel = 'Other collection';

module.exports.show = async (req, res) => {
    const address = await Address.findById(req.params.id);
    const binCollections = await BinCollectionDates.find({
        uprn: address.uprn,
    });

    dbDebug(address);
    dbDebug(binCollections);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
};
