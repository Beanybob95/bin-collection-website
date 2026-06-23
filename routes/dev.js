const express = require('express');
const router = express.Router();
const {
    sendTodayBinReminders,
} = require('../services/emailNotificationService.js');

router.post('/send-reminders', async (req, res) => {
    // 404 rather than 403: returning 403 would reveal that the endpoint exists,
    // which could invite probing in production. 404 hides it entirely.
    if (process.env.NODE_ENV === 'production') {
        return res.sendStatus(404);
    }

    await sendTodayBinReminders();
    res.send('Reminder job ran.');
});

module.exports = router;
