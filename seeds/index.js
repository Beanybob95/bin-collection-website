const mongoose = require('mongoose');
const BinCollectionDates = require('../models/BinCollectionDates');
const seedDebug = require('debug')('app:seed');

mongoose.connect('mongodb://localhost:27017/bincollection', {});
const db = mongoose.connection;
db.on('error', (err) => seedDebug('connection error: ', err));
db.once('open', () => {
    seedDebug('Connected to MongoDB');
});

const seedDB = async () => {
    try {
        // await BinCollectionDates.deleteMany({});
        const b = new BinCollectionDates({
            date: new Date('2025-05-13'),
            type: 'pod' /*'pod' or 'res'*/,
            description:
                'Recycling & Glass' /* 'Household waste' or 'Recycling & Glass'*/,
            uprn: '100121079275',
        });
        await b.save();
        seedDebug('Saved: ', b);
    } catch (err) {
        seedDebug('Error seeding database: ', err);
    }
};

seedDB();
