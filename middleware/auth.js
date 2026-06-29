const User = require('../models/User');

module.exports.loadUser = async (req, res, next) => {
    if (req.session.userId) {
        try {
            res.locals.currentUser = await User.findById(req.session.userId);
        } catch (err) {
            return next(err);
        }
    }
    next();
};

module.exports.requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};
