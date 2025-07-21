const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const BinCollectionDates = require('../models/BinCollectionDates');
const { parse } = require('date-fns')
const dbDebug = require('debug')('app:db');

//This code will send an API request for each remaining month in the current year and then send the data to the binCollectionDatesService function to parse the data.
const getCollectionDatesThisYear = async function(postcode, uprn){
   const year = new Date().getFullYear();
   const month = new Date().getMonth() +1; //+1 because now.getMonth() is 0-based
   const url = 'https://ilforms.wiltshire.gov.uk/wastecollectiondays/collectionlist'
   for (let i = month; i <= 12; i++){
      axios.post(url, {
         Month: i,
         Year: year,
         Postcode: postcode,
         Uprn: uprn
      }).then(response => {
         return binCollectionDatesService(response.data, uprn);
      }).catch(err => {
         dbDebug(`Error for month: ${i}`)
         dbDebug(err);
          }
      )
   }
}

//This code will parse the data from the API request which will pull out the bin collection dates from the HTML response. It then sends the parsed data to the saveCollectionDates function to save the data to the database.
const binCollectionDatesService = async function(html, uprn){
   const $ = cheerio.load(html);
   const collectionData = [];
   $('a[data-event-id]').each((i, el) => {
      const dateString = $(el).attr('data-original-datetext');
      const dateObject = parse(dateString, 'EEEE d MMMM, yyyy', new Date());
      collectionData.push({
         type: $(el).attr('data-event-id'),
         description: $(el).attr('data-original-title'),
         date: dateObject,
         uprn: uprn
      });
   });
   dbDebug(collectionData);
   saveCollectionDates(collectionData);
};


// This code accepts an array of bin collection dates and saves the data to the database.
const saveCollectionDates = async function(arr){
   dbDebug(arr);
   const deleteResult = await BinCollectionDates.deleteMany({ uprn: arr[0].uprn });
   dbDebug(deleteResult);
   const saveResult = await BinCollectionDates.insertMany(arr);
   dbDebug(saveResult);
}

module.exports = {
   getCollectionDatesThisYear
};
