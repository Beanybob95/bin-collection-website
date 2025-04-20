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
    res.render('mainviews/show', { address, binCollections });
})

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