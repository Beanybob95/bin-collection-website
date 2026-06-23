const axios = require('axios');
const mongoose = require('mongoose');
const BinCollectionDates = require('../models/BinCollectionDates');
const dbDebug = require('debug')('app:db');

// The council API serialises dates using the legacy ASP.NET JSON format
// "/Date(milliseconds)/" rather than ISO 8601, so standard JSON.parse
// won't produce a Date — we have to extract the timestamp manually.
const parseDotNetDate = (dotNetDateString) => {
    if (!dotNetDateString) return null;

    // Handles "/Date(1746403200000)/" and also escaped variants "\/Date( ... )\/"
    const match = String(dotNetDateString).match(/Date\((\d+)\)/);
    if (!match) return null;

    const ms = Number(match[1]);
    if (!Number.isFinite(ms)) return null;

    return new Date(ms);
};

// The council API endpoint returns a full HTML page rather than JSON.
// The collection data is embedded as a JS variable assignment in a script block,
// so we regex it out and parse it rather than using a proper JSON endpoint.
const extractModelDataFromHtml = (html) => {
    // Looks for: modelData = { ... };
    const match = String(html).match(/modelData\s*=\s*(\{[\s\S]*?})\s*;/);
    if (!match) return null;

    try {
        return JSON.parse(match[1]);
    } catch (e) {
        dbDebug('Failed to JSON.parse modelData payload');
        dbDebug(e);
        return null;
    }
};

const parseMonthCollectionDates = (html, uprn) => {
    const modelData = extractModelDataFromHtml(html);
    const rows = Array.isArray(modelData?.MonthCollectionDates)
        ? modelData.MonthCollectionDates
        : [];

    return rows
        .map((row) => {
            const date = parseDotNetDate(row?.Date);
            const type = String(row?.RoundTypeCode || '').toLowerCase();
            const description = String(row?.RoundTypeName || '').trim();

            if (!date || !type) return null;

            return {
                date,
                type,
                description,
                uprn,
            };
        })
        .filter(Boolean);
};

// The council API occasionally returns the same collection event more than once
// in a month's response, so we deduplicate before inserting to avoid duplicates
// in the calendar view.
const dedupeByUprnTypeDate = (items) => {
    const seen = new Set();
    const out = [];

    for (const item of items) {
        const key = `${item.uprn}|${item.type}|${item.date.toISOString()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }

    return out;
};

const getCollectionDatesThisYear = async function (postcode, uprn, addressId) {
    const year = new Date().getFullYear();
    const startMonth = new Date().getMonth() + 1; // 1..12
    const url = process.env.BIN_COLLECTION_API;

    const months = [];
    for (let m = startMonth; m <= 12; m++) months.push(m);

    try {
        // The council API only returns one month per request, so we fire all
        // remaining months in parallel rather than sequentially to minimise wait time.
        const responses = await Promise.all(
            months.map((Month) =>
                axios.post(url, {
                    Month,
                    Year: year,
                    Postcode: postcode,
                    Uprn: uprn,
                })
            )
        );

        const allDates = dedupeByUprnTypeDate(
            responses
                .flatMap((r) => parseMonthCollectionDates(r.data, uprn))
                .sort((a, b) => a.date - b.date)
        );

        dbDebug(allDates);

        if (!allDates.length) {
            dbDebug(
                'No collection dates found in modelData.MonthCollectionDates.'
            );
            return;
        }

        // Full replace rather than upsert: if the council removes or reschedules a
        // date upstream, a stale document would never be cleaned up by an upsert.
        const deleteResult = await BinCollectionDates.deleteMany({ uprn });
        dbDebug(deleteResult);

        const saveResult = await BinCollectionDates.insertMany(allDates);
        dbDebug(saveResult);

        await mongoose.model('Address').findByIdAndUpdate(addressId, { lastRefresh: new Date() });
    } catch (err) {
        dbDebug('Error fetching/parsing collection dates');
        dbDebug(err);
    }
};

module.exports = {
    getCollectionDatesThisYear,
    parseDotNetDate,
    extractModelDataFromHtml,
    parseMonthCollectionDates,
    dedupeByUprnTypeDate,
};
