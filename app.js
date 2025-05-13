const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const ejsMate = require('ejs-mate')
const Address = require('./models/Address')
const BinCollectionDates = require('./models/BinCollectionDates')
const axios = require('axios')
const sass = require('sass');
const result = sass.compile('./public/styles/sass/main.scss', {
    loadPaths: [path.join(__dirname, 'node_modules')] // This allows Sass to find files in node_modules
});


mongoose.connect('mongodb://localhost:27017/bincollection',{});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
})

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





app.get('/', async (req, res) => {
    res.render('home');
})

app.get('/addresses', async (req, res) => {
    const addresses = await Address.find({})
    res.render('mainviews/index', { addresses })
})
app.get('/bincollection/:id', async (req, res) => {
    const address = await Address.findById(req.params.id);
    const binCollections = await BinCollectionDates.find({ uprn: address.uprn });
    res.render('mainviews/calendar', { address, binCollections });
})
app.get('/addresses/new', async (req, res) => {
        res.render('mainviews/new')
})

app.post('/addresses', async (req, res) => {
    try {
        const { uprn, postcode, housenumber, roadname, county } = req.body;

        // Check if the address already exists
        let address = await Address.findOne({ uprn });

        if (address) {
            // If the address exists, redirect to its page
            res.redirect(`/bincollection/${address._id}`);
        } else {
            // Create a new address document
            const newAddress = new Address({
                uprn,
                postcode,
                housenumber,
                roadname,
                county
            });

            // Save the new address
            await newAddress.save();

            // Redirect to the bin collection page for this new address
            res.redirect(`/bincollection/${newAddress._id}`);
        }
    } catch (error) {
        console.error('Error saving address:', error);
        res.status(500).send('Error saving address');
    }
});


app.post('/api/addresslist', async (req, res) => {
    try {
        // Get postcode from request body
        const { postcode } = req.body;

        if (!postcode) {
            return res.status(400).json({ error: 'Postcode is required' });
        }

        // Make the request to the Wiltshire Council API
        const response = await axios.post(
            'https://ilforms.wiltshire.gov.uk/wastecollectiondays/addresslist',
            `Postcode=${encodeURIComponent(postcode)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        // Forward the response back to the client
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying address request:', error);
        res.status(500).json({
            error: 'Error fetching addresses',
            message: error.message
        });
    }
});

app.listen(3000, ()=> {
    console.log("My has server started on port 3000");
})









// axios.post('https://ilforms.wiltshire.gov.uk/wastecollectiondays/collectionlist', {
//     Month: '4',
//     Year: '2025',
//     Postcode: 'sn126sl',
//     Uprn: '100121079275'
// })
//     .then(function (response) {
//         console.log(response);
//     })
//     .catch(function (error) {
//         console.log(error);
//     });