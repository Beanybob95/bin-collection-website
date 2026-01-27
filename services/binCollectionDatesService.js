const cheerio = require('cheerio');
const axios = require('axios');
const BinCollectionDates = require('../models/BinCollectionDates');
const dbDebug = require('debug')('app:db');

const parseDotNetDate = (dotNetDateString) => {
   if (!dotNetDateString) return null;

   // Handles "/Date(1746403200000)/" and also escaped variants "\/Date( ... )\/"
   const match = String(dotNetDateString).match(/Date\((\d+)\)/);
   if (!match) return null;

   const ms = Number(match[1]);
   if (!Number.isFinite(ms)) return null;

   return new Date(ms);
};

const extractModelDataFromHtml = (html) => {
   // Looks for: modelData = { ... };
   const match = String(html).match(/modelData\s*=\s*(\{[\s\S]*?\})\s*;/);
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
   const rows = Array.isArray(modelData?.MonthCollectionDates) ? modelData.MonthCollectionDates : [];

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

// Sends an API request for each remaining month in the current year,
// extracts the embedded modelData JSON, and saves all dates for the uprn.
const getCollectionDatesThisYear = async function (postcode, uprn) {
   const year = new Date().getFullYear();
   const startMonth = new Date().getMonth() + 1; // 1..12
   const url = 'https://ilforms.wiltshire.gov.uk/wastecollectiondays/collectionlist';

   const months = [];
   for (let m = startMonth; m <= 12; m++) months.push(m);

   try {
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
         dbDebug('No collection dates found in modelData.MonthCollectionDates.');
         return;
      }

      // Delete once per uprn, then insert all months we fetched
      const deleteResult = await BinCollectionDates.deleteMany({ uprn });
      dbDebug(deleteResult);

      const saveResult = await BinCollectionDates.insertMany(allDates);
      dbDebug(saveResult);
   } catch (err) {
      dbDebug('Error fetching/parsing collection dates');
      dbDebug(err);
   }
};

module.exports = {
   getCollectionDatesThisYear,
};
