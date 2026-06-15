require('dotenv').config();
const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const ejsMate = require('ejs-mate')
const morgan = require('morgan')
const appDebug = require('debug')('app:main');
const dbDebug = require('debug')('app:db');
const methodOverride = require('method-override');
const sass = require('sass');
const addressRoutes = require('./routes/addresses');
const binCollectionRoutes = require('./routes/binCollections');
const apiRoutes = require('./routes/api');
const devRoutes = require('./routes/dev');
const { startEmailNotificationSchedule } = require('./services/emailNotificationService');
const compileResult = sass.compile('./public/styles/scss/main.scss', {
    loadPaths: [path.join(__dirname, 'node_modules')]
});

const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/bincollection?replicaSet=rs0';
mongoose.connect(mongoURL)
    .then(() => dbDebug(`Connected to MongoDB at ${mongoURL}`))
    .catch((err) => console.error('MongoDB connection error:', err));

// Starts MongoDB and also starts the emailNotificationService service via Cron Schedule
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    dbDebug('Connected to MongoDB');
    startEmailNotificationSchedule();
})

const app = express();

app.listen(process.env.PORT, ()=> {
    appDebug(`My server has started on port ${process.env.PORT}`);
})

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('tiny'))

app.use('/addresses', addressRoutes);
app.use('/bincollection', binCollectionRoutes);
app.use('/api', apiRoutes);
app.use('/dev', devRoutes);

app.get('/', async (req, res) => {
    res.render('home');
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
