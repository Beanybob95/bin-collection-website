const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const ejsMate = require('ejs-mate')
const morgan = require('morgan')
const appDebug = require('debug')('app:main');
const dbDebug = require('debug')('app:db');
const Address = require('./models/Address')
const BinCollectionDates = require('./models/BinCollectionDates')
const Contacts = require('./models/Contacts')
const axios = require('axios')
const methodOverride = require('method-override');
const sass = require('sass');
const compileResult = sass.compile('./public/styles/scss/main.scss', {
    loadPaths: [path.join(__dirname, 'node_modules')]
});

const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/bincollection';
mongoose.connect(mongoURL)
    .then(() => dbDebug(`Connected to MongoDB at ${mongoURL}`))
    .catch((err) => console.error('MongoDB connection error:', err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    dbDebug('Connected to MongoDB');
})

const app = express();

app.listen(3000, ()=> {
    appDebug("My has server started on port 3000");
})

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('tiny'))






app.get('/', async (req, res) => {
    res.render('home');
})

app.get('/addresses', async (req, res) => {
    const addresses = await Address.find({})
    dbDebug(addresses)
    res.render('mainviews/index', {
        title:'Addresses',
        addresses })
})

app.get('/addresses/new', async (req, res) => {
        res.render('mainviews/newAddress', {title:'New Address'})
})

app.get('/addresses/:id/newcontact', async (req, res) => {
    const address = await Address.findById(req.params.id)
    dbDebug(address)
    res.render('mainviews/newContact', {
        title:'New Contact',
        address})
})

app.get('/addresses/:id', async (req, res) => {
    const address = await Address.findById(req.params.id)
    const contacts = await Contacts.find({ uprn: address.uprn });
    dbDebug(address)
    dbDebug(contacts)
    res.render('mainviews/show', {
        title:'Address Details',
        address,
        contacts})
});

app.post('/addresses/:id/newcontact', async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);

        if (!address) {
            console.error('Address not found');
            return res.status(404).send('Address not found');
        }

        // Extract the form data
        const { firstname, lastname, email } = req.body;

        // Create a new contact
        const newContact = new Contacts({
            uprn: address.uprn,
            firstname,
            lastname,
            email
        });

        // Save the contact
        await newContact.save();

        // Redirect back to the address details page
        res.redirect(`/addresses/${address._id}`);
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).send('Error saving contact');
    }
});

app.post('/addresses', async (req, res) => {
    try {
        const { uprn, postcode, housenumber, roadname, county } = req.body;

        // Check if the address already exists
        let address = await Address.findOne({ uprn });

        if (address) {
            // If the address exists, redirect to its page
            res.redirect(`/addresses`);
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
            res.redirect(`/addresses`);
        }
    } catch (error) {
        console.error('Error saving address:', error);
        res.status(500).send('Error saving address');
    }
});

app.get('/bincollection/:id', async (req, res) => {
    const address = await Address.findById(req.params.id);
    const binCollections = await BinCollectionDates.find({ uprn: address.uprn });
    dbDebug(address)
    dbDebug(binCollections)
    res.render('mainviews/calendar', {
        title:'Collection Dates',
        address,
        binCollections });
})



app.delete('/contacts/:id', async (req, res) => {
    try {
        const contact = await Contacts.findByIdAndDelete(req.params.id);
        dbDebug(contact)
        // Redirect back to the referring page (the page that sent the request)
        const referer = req.get('Referer');
        res.redirect(referer || '/addresses');
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).send('Error deleting contact');
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