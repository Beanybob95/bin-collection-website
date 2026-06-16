require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const morgan = require('morgan');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const {
    csrfSynchronisedProtection,
    generateToken,
} = require('./middleware/csrf');
const appDebug = require('debug')('app:main');
const dbDebug = require('debug')('app:db');
const methodOverride = require('method-override');
const authRoutes = require('./routes/auth');
const addressRoutes = require('./routes/addresses');
const binCollectionRoutes = require('./routes/binCollections');
const apiRoutes = require('./routes/api');
const devRoutes = require('./routes/dev');
const { loadUser, requireAuth } = require('./middleware/auth');
const {
    startEmailNotificationSchedule,
} = require('./services/emailNotificationService');

const mongoURL =
    process.env.MONGO_URL ||
    'mongodb://localhost:27017/bincollection?replicaSet=rs0';
mongoose
    .connect(mongoURL)
    .then(() => dbDebug(`Connected to MongoDB at ${mongoURL}`))
    .catch((err) => dbDebug('MongoDB connection error: ', err));

// Starts MongoDB and also starts the emailNotificationService service via Cron Schedule
const db = mongoose.connection;
db.on('error', (err) => dbDebug('connection error: ', err));
db.once('open', () => {
    dbDebug('Connected to MongoDB');
    startEmailNotificationSchedule();
});

const app = express();

app.listen(process.env.PORT, () => {
    appDebug(`My server has started on port ${process.env.PORT}`);
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(morgan('tiny'));

// Blanket backstop: loadUser (below) runs a DB lookup on every request,
// ahead of any router-specific rate limiter, so it needs its own coverage.
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 300, // generous, per-IP cap across the whole app
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.' },
    })
);

app.use(
    session({
        // Avoid the default `connect.sid` name, which fingerprints the server as Express.
        name: 'sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: mongoURL }),
        cookie: {
            httpOnly: true,
            // Conditional on purpose: hardcoding `true` would stop the session cookie
            // being sent over plain HTTP in local dev. nosemgrep: express-cookie-session-no-secure
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined,
            // maxAge (not a literal `expires`) is the correct mechanism here: express-session
            // recomputes `expires` as `now + maxAge` fresh for every session, whereas a literal
            // `expires` value would be a single fixed timestamp from server startup that goes
            // stale. nosemgrep: express-cookie-session-no-expires
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);
app.use(loadUser);
app.use((req, res, next) => {
    res.locals.csrfToken = generateToken(req);
    next();
});
app.use(csrfSynchronisedProtection);

app.use('/', authRoutes);
app.use('/addresses', requireAuth, addressRoutes);
app.use('/bincollection', requireAuth, binCollectionRoutes);
app.use('/api', requireAuth, apiRoutes);
app.use('/dev', devRoutes);

app.get('/', (req, res) => {
    res.redirect('/addresses');
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
