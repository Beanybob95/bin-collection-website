const express = require('express');
const router = express.Router();
const { sendTodayBinReminders } = require('../services/emailNotificationService.js');

// Starts the emailNotificationService service to test email sending
router.post('/send-reminders', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.sendStatus(404);
    }

    await sendTodayBinReminders();
    res.send('Reminder job ran.');
});

module.exports = router;