const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const BinCollectionDates = require('../models/BinCollectionDates');
const { parse } = require('date-fns')

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
         console.log(`Error for month: ${i}`)
         console.log(err);
          }
      )
   }
}

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
   console.log(collectionData);
   saveCollectionDates(collectionData);
};



const saveCollectionDates = async function(arr){
   console.log(arr);
   const result = await BinCollectionDates.insertMany(arr);
   console.log(result);
}

module.exports = {
   getCollectionDatesThisYear
};
