const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { startOfToday, endOfToday } = require('date-fns');

const Contacts = require('../models/Contacts');
const BinCollectionDates = require('../models/BinCollectionDates');

const emailDebug = require('debug')('app:email');

// Sets up the email account parameters
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
};

// Function to send the email
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

// Function to list all bin collection records for today, then grabs all contacts that are linked to each bin collection record then calls the send email function
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
        const contacts = await Contacts.find({
            uprns: collection.uprn,
            email: { $exists: true, $ne: '' },
        });

        for (const contact of contacts) {
            const name = contact.firstname || 'there';

            await sendEmail({
                to: contact.email,
                subject: `Bin collection reminder: ${collection.description}`,
                text: `Hi ${name},

This is a reminder that you have a bin collection today.

Collection type: ${collection.description}
Date: ${collection.date.toDateString()}

Thanks`,
            });

            emailDebug(`Sent reminder to ${contact.email}`);
        }
    }
};

// Function to set/define the cron scheduler. This is triggered on app start when the DB has loaded.
const startEmailNotificationSchedule = () => {
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
