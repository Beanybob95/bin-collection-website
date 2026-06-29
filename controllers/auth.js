const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendEmail } = require('../services/emailNotificationService');
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

        // Store as a plain string rather than an ObjectId so session serialisation
        // round-trips cleanly and string comparisons work without .equals().
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
        res.status(500).render('auth/signup', {
            title: 'Sign up',
            error: 'Something went wrong. Please try again.',
            formData: req.body,
        });
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
        // password || '' guards against an undefined/null body field reaching bcrypt.compare,
        // which would throw rather than returning false.
        // A single generic error message for both wrong email and wrong password prevents
        // user-enumeration attacks (an attacker can't tell which was wrong).
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
        res.status(500).render('auth/login', {
            title: 'Log in',
            error: 'Something went wrong. Please try again.',
            formData: req.body,
        });
    }
};

module.exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};

module.exports.forgotPasswordForm = (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Reset your password',
        error: null,
        success: false,
        formData: {},
    });
};

module.exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).render('auth/forgot-password', {
            title: 'Reset your password',
            error: 'Please enter your email address',
            success: false,
            formData: req.body,
        });
    }

    const showGenericSuccess = () =>
        res.render('auth/forgot-password', {
            title: 'Reset your password',
            error: null,
            success: true,
            formData: {},
        });

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            return showGenericSuccess();
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${token}`;

        await sendEmail({
            to: user.email,
            subject: 'Password reset request',
            text: `Hi ${user.firstname},\n\nYou requested a password reset. Click the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
        });

        return showGenericSuccess();
    } catch (err) {
        dbDebug('Error sending password reset email: ', err);
        res.status(500).render('auth/forgot-password', {
            title: 'Reset your password',
            error: 'Something went wrong. Please try again.',
            success: false,
            formData: req.body,
        });
    }
};

module.exports.resetPasswordForm = async (req, res, next) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        res.render('auth/reset-password', {
            title: 'Set a new password',
            token: req.params.token,
            error: null,
            invalidToken: !user,
        });
    } catch (err) {
        next(err);
    }
};

module.exports.resetPassword = async (req, res, next) => {
    const { password, confirmPassword } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.render('auth/reset-password', {
                title: 'Set a new password',
                token: req.params.token,
                error: 'This reset link is invalid or has expired.',
                invalidToken: true,
            });
        }

        if (!password || password.length < 8) {
            return res.status(400).render('auth/reset-password', {
                title: 'Set a new password',
                token: req.params.token,
                error: 'Password must be at least 8 characters long',
                invalidToken: false,
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('auth/reset-password', {
                title: 'Set a new password',
                token: req.params.token,
                error: 'Passwords do not match',
                invalidToken: false,
            });
        }

        user.passwordHash = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.redirect('/login');
    } catch (err) {
        next(err);
    }
};
