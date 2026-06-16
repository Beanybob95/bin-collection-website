const User = require('../models/User');

module.exports.loadUser = async (req, res, next) => {
    if (req.session.userId) {
        res.locals.currentUser = await User.findById(req.session.userId);
    }
    next();
};

module.exports.requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};
