/**
 * This script is designed to exclude contacts from a list.
 * The typical scenario is when the P&DD team provides a Salesforce report,
 * but you want to further exclude people who have been on a previous journey.
 *
 * To do this, you will need to follow these steps:
 * 1. Export the contact list from the Salesforce report, and save it as DE_1.
 * 2. Export the data extension that you want to exclude, and save it as DE_2.
 * 3. Use this script to remove people who are present in both DE_1 and DE_2.
 * 4. The script will output the result list with the specified target data extension name.
 */

const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const format = require('date-fns/format')

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const querystring = require("querystring");
const request = require("request");
const axios = require("axios");
const cliProgress = require('cli-progress');

require('dotenv').config()

// EDIT HERE!
let deCsvPath = '/Users/upchen/Downloads/report1692245680021.csv'
let outputDeCsvPath = '/Users/upchen/Downloads/report1692245680021-generated.csv'

let URLCallToAction = "ONEOFF"; // UPGRADE or ONEOFF or COLA
let askAmount = 50000; // batch 2
  // Group A: RD amount <20,000 : Asking Amount 50,000 (min. 30,000)
  // Group B: RD amount >=20,000 : Asking Amount 70,000 (mn. 30,000)

let campaignId = "7012u000000h2ZFAAY"; // Special Appeal - SMS - 2023 - KR
let utm_campaign = "special_appeal";
let utm_source = "donor_journey";
let utm_medium = "sms";
// let utm_content = "kr-special_appeal-adhoc-20230825-batch_2_rg_cc-1click_url_generation-sms";
let utm_content = "230830_climate_RG_CC_1click_url_sms_Other";
let utm_term = "";

const ContactIdFieldName = 'Id (18 digit)'
const RGStatusFieldName = 'Recurring Donation Status'
const RGPaymentMethodFieldName = 'Recurring Donation Payment Method'

const longLinkFieldName = 'long_link'
const shortenLinkFieldName = 'url2'

async function shortenUrl(longUrl) {
  const accessToken = process.env.BITLY_TOKEN;
  const headers = {
    "Content-Type": "application/json",
    Authorization: accessToken
  };
  const payload = {
    long_url: longUrl
  };

  try {
    const response = await axios.post("https://api-ssl.bitly.com/v4/shorten", payload, { headers });
    const bitlyUrl = response.data.id;
    const shortenUrl = `https://${bitlyUrl}`;

    return shortenUrl;
  } catch (error) {
    console.error(error);
    throw error
  }
}

async function processRow(params) {
  const { baseDe, i} = params
  const row = baseDe[i];

  // determine is able to use 1click URLS
  let isAbleToUse1ClickOneoff = false;
  let isAbleToUse1ClickUpgrade = false;
  let isAbleToUse1ClickCola = true;

  let ContactId = row[ContactIdFieldName]
  let RgStatus = row[RGStatusFieldName]
  let RgPaymentMethod = row[RGPaymentMethodFieldName]

  if (RgStatus === "Active") {
    if (RgPaymentMethod === "Credit Card") {
      isAbleToUse1ClickOneoff = true;
    }
    if (RgPaymentMethod === "Credit Card" || RgPaymentMethod === "CMS") {
      isAbleToUse1ClickUpgrade = true;
    }
  }

  // determine the askAmount
  if (row['Group']==="A") {
    askAmount = 50000
    utm_content = "230830_climate_RG_CC_1click_url_sms_A";
  } else if (row['Group']==="B") {
    askAmount = 70000
    utm_content = "230830_climate_RG_CC_1click_url_sms_B";
  } else {
    askAmount = 50000
    utm_content = "230830_climate_RG_CC_1click_url_sms_Other";
  }

  // Start to generate the links
  let longUrl = null;
  let base64ContactId = Buffer.from(ContactId).toString('base64');
  let oneClickQs = querystring.stringify({
    id: base64ContactId,
    Campaign__c: campaignId,
    utm_campaign: utm_campaign,
    utm_source: utm_source,
    utm_medium: utm_medium,
    utm_content: utm_content,
    utm_term: utm_term,
    UpgradeAmount: askAmount
  })

  if (URLCallToAction === 'UPGRADE' && isAbleToUse1ClickUpgrade) {
    longUrl = `https://cloud.greensk.greenpeace.org/oneclick-upgrade?${oneClickQs}`
  } else if (URLCallToAction === 'ONEOFF' && isAbleToUse1ClickUpgrade) {
    longUrl = `https://cloud.greensk.greenpeace.org/oneclick-oneoff?${oneClickQs}`
  } else if (URLCallToAction === 'COLA' && isAbleToUse1ClickCola) {
    longUrl = `https://cloud.greensk.greenpeace.org/oneclick-cola?${oneClickQs}`
  }

  // shorten the links
  let shortenLink = null
  if (longUrl) {
    shortenLink = await shortenUrl(longUrl)
  }

  // write back to the CSV
  baseDe[i][longLinkFieldName] = longUrl ? longUrl : 'NA'
  baseDe[i][shortenLinkFieldName] = shortenLink ? shortenLink : 'NA'

  return baseDe[i]
}


/**
 * Send all the email previews of a journey
 */
async function main() {
  // start to process
  let baseDe = parse(fs.readFileSync(deCsvPath), { columns: true });
  logger.info(`Data Extension loaded with ${baseDe.length} rows.`)

  // baseDe = baseDe.slice(0,100) // for debug

  // Check the necessary fields is present
  if (baseDe.length < 1) {
    throw new Error('Loaded the empty CSV. Please check the CSV file')
  }
  if (!baseDe[0].hasOwnProperty(ContactIdFieldName)) {
    throw new Error(`The required field ${ContactIdFieldName} is not present in the CSV file.`)
  } if (!baseDe[0].hasOwnProperty(RGStatusFieldName)) {
    throw new Error(`The required field ${RGStatusFieldName} is not present in the CSV file.`)
  }
  if (!baseDe[0].hasOwnProperty(RGPaymentMethodFieldName)) {
    throw new Error(`The required field ${RGPaymentMethodFieldName} is not present in the CSV file.`)
  }

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(baseDe.length);

  let promises = []
  for (let i = 0; i < baseDe.length; i++) {
    progressBar.increment()
    promises.push(processRow({ baseDe, i}))

    await new Promise(resolve => setTimeout(resolve, 25)); // throttle. the minute rate limit is 5000 per minutes

    if (i>0 && i%3000==0) {
      await new Promise(resolve => setTimeout(resolve, 5*1000)); // ensure consume all the requests immediately
    }
  }
  progressBar.stop();

  // wait all apis
  await Promise.allSettled(promises)
    .then((results) => {
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          // console.log(`Promise ${result.index} fulfilled with value ${result.value}`);
        } else {
          console.log(`Promise ${result.index} ${result.status} with reason ${result.reason}`);
        }
      });
    })
    .catch((error) => {
      console.error(error);
    });

  // additional patch step
  // Since KR LMS only recognize the specific name, we need to copy it from original fields
  // name, mobilephone
  let crmField2LMSFieldMap = {
    'Last Name': 'name',
    'Mobile': 'mobilephone'
  }

  Object.keys(crmField2LMSFieldMap).forEach(crmField => {
    let lmsField = crmField2LMSFieldMap[crmField]
    if (!baseDe[0].hasOwnProperty(lmsField) && baseDe[0].hasOwnProperty(crmField)) {
      logger.warn(`Cannot find the ${lmsField} field in the file. Dup it from ${crmField}`)
    }
  })
  for (let i = 0; i < baseDe.length; i++) {
    Object.keys(crmField2LMSFieldMap).forEach(crmField => {
      let lmsField = crmField2LMSFieldMap[crmField]

      if (!baseDe[i].hasOwnProperty(lmsField) && baseDe[0].hasOwnProperty(crmField)) {
        baseDe[i][lmsField] = baseDe[i][crmField]
      }
    })
  }

  // Write the target DE to a file
  logger.info(`Wrirting to ${outputDeCsvPath} with ${baseDe.length} rows`)
  fs.writeFileSync(outputDeCsvPath, stringify(baseDe, { header: true }));

  // logger.info(`Done!`)
}


(async () => {
  var text = await main();
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError) {
    console.error(e)

    if (e.response.data) {
      logger.error(JSON.stringify(e.response.data, null, 2))
    }
  }
});
