const mongoose = require('mongoose')
const BinCollectionDates = require('../models/BinCollectionDates')

mongoose.connect('mongodb://localhost:27017/bincollection',{});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
})



const seedDB = async () => {
    try {
        // await BinCollectionDates.deleteMany({});
        const b = new BinCollectionDates({
            date: new Date('2025-05-13'),
            type: 'pod' /*'pod' or 'res'*/,
            description: 'Recycling & Glass' /* 'Household waste' or 'Recycling & Glass'*/,
            uprn: '100121079275'
        });
        await b.save();
        console.log('Saved:', b);
    } catch (err) {
        console.error('Error seeding database:', err);
    }
}

seedDB();