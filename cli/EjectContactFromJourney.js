const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')
const {parse} = require('csv-parse/sync')
const fs = require("fs");

async function main () {
  let mcbase = new MCBase({
    clientId: process.env.MC_TW_CLIENTID,
    clientSecret: process.env.MC_TW_CLIENTSECRET,
    subDomain: process.env.MC_TW_SUBDOMAIN,
    accountId: process.env.MC_TW_ACCOUNTID,
  })
  await mcbase.doAuth()

  let mcJourney = mcbase.factory('Journey')
  let mcAutomation = mcbase.factory('Automation')

  // assign the journey names
  let jName = "tw-welcome_new_donor-automd-20220311"

  // read the contact Id from CSV file
  let csvPath = "/Users/upchen/Downloads/TW 20221219 unexpected people in welcome - people to eject.csv"

  const fContent = fs.readFileSync(csvPath).toString();
  const records = parse(fContent, {
    columns: true,
    skip_empty_lines: true
  });

  // To eject these contact from the journey
  let contactKeys = records.map(row => row['Contact:Id'])

  let j = await mcJourney.findByName(jName)
  let jKey = _.get(j, 'items.0.key')

  for (let i = 8544; i < contactKeys.length; i++) {
    const contactKey = contactKeys[i];
    logger.info(`${i+1}/${contactKeys.length} Ejecting contactId ${contactKey} from journey ${jName}`)
    let r = await mcJourney.ejectContact(jKey, contactKey)
    console.log(r)

    if (i%100==0) {
      await mcbase.doAuth()
    }
  }

  let stat = await mcJourney.getJourneyStatByName(jName)
  delete stat.journey
  console.log('stat', stat)
}


(async () => {
  var text = await main();
})().catch(e => {
  logger.error(e.stack)

  if (e.isAxiosError) {
    console.error(e)

    if (e.response.data) {
      logger.error(JSON.stringify(e.response.data,null,2))
    }
  }
});
