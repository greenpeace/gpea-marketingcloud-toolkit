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
const {parse} = require('csv-parse/sync');
const {stringify} = require('csv-stringify/sync');

/**
 * Send all the email previews of a journey
 */
async function main() {
  // EDIT HERE!
  // let baseDECsvPath = '/Users/upchen/Downloads/report1675153322655.csv'
  let baseDECsvPath = '/Users/upchen/Downloads/20230203 KR Annual Middle Upgrade Audiences/20230203 middle high upgrade targe.csv'
  let baseKeyFieldName = 'Id (18 digit)'
  
  let excludeFromCsvPaths = [
    '/Users/upchen/Downloads/20230203 KR Annual Middle Upgrade Audiences/kr-annual_upgrade-adhoc-20221201.csv',
    '/Users/upchen/Downloads/20230203 KR Annual Middle Upgrade Audiences/kr-middle_donor_upgrade-adhoc-20221201.csv'
  ]
  let excludeKeyFieldName = 'Id'

  let outputCsvPath = '/Users/upchen/Downloads/20230203 KR Annual Middle Upgrade Audiences/20230203 middle high upgrade targe - excluded.csv'
  // Read DE_1 and DE_2 files
  let baseDe = parse(fs.readFileSync(baseDECsvPath), { columns: true });
  logger.info(`Base Data Extension loaded with ${baseDe.length} rows.`)

  for (let i = 0; i < excludeFromCsvPaths.length; i++) {
    const path = excludeFromCsvPaths[i];
    const deToExclude = parse(fs.readFileSync(path), { columns: true }); 

    logger.info(`Data Extension ${path} loaded with ${deToExclude.length} rows.`)

    // Create a Set of DE_2 email addresses
    const deToExcludeKeySet = new Set(deToExclude.map(row => row[excludeKeyFieldName]));

    // Exclude DE_2 contacts from DE_1
    const filteredDe = baseDe.filter(row => deToExcludeKeySet.has(row[baseKeyFieldName]));
    logger.debug(`  Filtered ${filteredDe.length} rows from base De. sample Id: ${filteredDe.slice(0, 10).map(r=>r[baseKeyFieldName]).join(', ')}`)
    baseDe = baseDe.filter(row => !deToExcludeKeySet.has(row[baseKeyFieldName]));
    logger.info(`After filtering, base data extension remain ${baseDe.length}`)
  }
  
  // Write the target DE to a file
  logger.info(`Wrirting to ${outputCsvPath} with ${baseDe.length} rows`)
  fs.writeFileSync(outputCsvPath, stringify(baseDe, { header: true }));

  logger.info(`Done!`)
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
