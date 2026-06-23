const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { startOfToday, endOfToday } = require('date-fns');

const Address = require('../models/Address');
const User = require('../models/User');
const BinCollectionDates = require('../models/BinCollectionDates');

const emailDebug = require('debug')('app:email');

// createTransporter is a factory rather than a module-level singleton so that
// credentials are read from env at send time. A singleton would capture undefined
// values at startup if the app is run without email env vars (e.g. in dev/test).
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
};

const sendEmail = async ({ to, subject, text }) => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        emailDebug('Email credentials are not configured. Skipping email.');
        return;
    }

    const transporter = createTransporter();

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
    });
};

const sendTodayBinReminders = async () => {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();

    const collections = await BinCollectionDates.find({
        date: {
            $gte: todayStart,
            $lte: todayEnd,
        },
    });

    if (!collections.length) {
        emailDebug('No bin collections found for today.');
        return;
    }

    for (const collection of collections) {
        const address = await Address.findOne({ uprn: collection.uprn });
        if (!address) {
            continue;
        }

        const users = await User.find({
            addresses: address._id,
            email: { $exists: true, $ne: '' },
        });

        for (const user of users) {
            const name = user.firstname || 'there';

            await sendEmail({
                to: user.email,
                subject: `Bin collection reminder: ${collection.description}`,
                text: `Hi ${name},

This is a reminder that you have a bin collection today.

Collection type: ${collection.description}
Date: ${collection.date.toDateString()}

Thanks`,
            });

            emailDebug(`Sent reminder to ${user.email}`);
        }
    }
};

const startEmailNotificationSchedule = () => {
    // BIN_REMINDER_CRON lets ops change the send time without a deploy, and
    // also makes it easy to trigger more frequently (e.g. '* * * * *') during testing.
    const cronExpression = process.env.BIN_REMINDER_CRON || '0 8 * * *';

    cron.schedule(cronExpression, async () => {
        try {
            emailDebug('Running scheduled bin collection reminder job.');
            await sendTodayBinReminders();
        } catch (err) {
            emailDebug('Failed to send bin collection reminders.');
            emailDebug(err);
        }
    });

    emailDebug(
        `Email notification schedule started with cron: ${cronExpression}`
    );
};

module.exports = {
    sendTodayBinReminders,
    startEmailNotificationSchedule,
};
