const bcrypt = require('bcryptjs');
const User = require('../models/User');
const dbDebug = require('debug')('app:db');

module.exports.signupForm = (req, res) => {
    res.render('auth/signup', { title: 'Sign up', error: null, formData: {} });
};

module.exports.signup = async (req, res) => {
    const { firstname, lastname, email, password, confirmPassword } = req.body;

    if (!firstname || !lastname || !email || !password) {
        return res.status(400).render('auth/signup', {
            title: 'Sign up',
            error: 'Please fill in all fields',
            formData: req.body,
        });
    }

    if (password.length < 8) {
        return res.status(400).render('auth/signup', {
            title: 'Sign up',
            error: 'Password must be at least 8 characters long',
            formData: req.body,
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).render('auth/signup', {
            title: 'Sign up',
            error: 'Passwords do not match',
            formData: req.body,
        });
    }

    try {
        const existing = await User.findOne({
            email: email.toLowerCase().trim(),
        });
        if (existing) {
            return res.status(400).render('auth/signup', {
                title: 'Sign up',
                error: 'An account with that email already exists',
                formData: req.body,
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            firstname,
            lastname,
            email,
            passwordHash,
        });

        req.session.userId = user._id.toString();
        res.redirect('/addresses');
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).render('auth/signup', {
                title: 'Sign up',
                error: error.message,
                formData: req.body,
            });
        }
        dbDebug('Error signing up: ', error);
        res.status(500).send('Error signing up');
    }
};

module.exports.loginForm = (req, res) => {
    res.render('auth/login', { title: 'Log in', error: null, formData: {} });
};

module.exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({
            email: (email || '').toLowerCase().trim(),
        });
        const valid =
            user && (await bcrypt.compare(password || '', user.passwordHash));

        if (!valid) {
            return res.status(400).render('auth/login', {
                title: 'Log in',
                error: 'Incorrect email or password',
                formData: req.body,
            });
        }

        req.session.userId = user._id.toString();
        res.redirect('/addresses');
    } catch (error) {
        dbDebug('Error logging in: ', error);
        res.status(500).send('Error logging in');
    }
};

module.exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};
