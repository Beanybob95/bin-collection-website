const Address = require('../models/Address');
const BinCollectionDates = require('../models/BinCollectionDates');
const dbDebug = require('debug')('app:db');

module.exports.show = async (req, res) => {
    const address = await Address.findById(req.params.id);
    const binCollections = await BinCollectionDates.find({ uprn: address.uprn });

    dbDebug(address);
    dbDebug(binCollections);

    res.render('bin-collections/show', {
        title: 'Collection Dates',
        address,
        binCollections
    });
};