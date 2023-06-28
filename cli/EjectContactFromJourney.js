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
  let jName = "tw-comms-automd-reopen_not_reached_case-20230415"

  // // read the contact Id from CSV file
  // let csvPath = "/Users/upchen/Downloads/TW 20221219 unexpected people in welcome - people to eject.csv"

  // const fContent = fs.readFileSync(csvPath).toString();
  // const records = parse(fContent, {
  //   columns: true,
  //   skip_empty_lines: true
  // });

  // // To eject these contact from the journey
  // let contactKeys = records.map(row => row['Contact:Id'])

  let j = await mcJourney.findByName(jName)
  let jKey = _.get(j, 'items.0.key')

  let contactKeys = [
    "0032u00000JahNCAAZ",
    "0032u00000aG46yAAC",
    "0032u00000agcKOAAY",
    "0032u00000DpJhEAAV",
    "0032u00000DpO7pAAF",
    "0032u00000DpITJAA3",
    "0032u00000aFGMQAA4",
    "0032u00000aewqjAAA",
    "0032u00000DpVtiAAF",
    "0032u00000DpiHiAAJ",
    "0032u00000ahf0QAAQ",
    "0032u00000aGO5lAAG",
    "0032u00000ZayvSAAR",
    "0032u00000ZZB86AAH",
    "0032u00000F9xjNAAR",
    "0032u00000DpaDeAAJ",
    "0032u00000aHrSuAAK",
    "0032u00000Zb0qtAAB",
    "0032u00000EdH4uAAF",
    "0032u00000DpbGnAAJ",
    "0032u00000ENjFOAA1",
    "0032u00000XGFfAAAX",
    "0032u00000aHHiiAAG",
    "0032u00000ZcKEwAAN",
    "0032u00000F8B2uAAF",
    "0032u00000aGpopAAC",
    "0032u00000aIDuUAAW",
    "0032u00000aeQRlAAM",
    "0032u00000EO4JPAA1",
    "0032u00000aFqCEAA0",
    "0032u00000af7zsAAA",
    "0032u00000ae8gEAAQ",
    "0032u00000F9mT9AAJ",
    "0032u00000F9FQEAA3",
    "0032u00000F9fZhAAJ",
    "0032u00000F8NLlAAN",
    "0032u00000DpjXdAAJ",
    "0032u00000DpOauAAF",
    "0032u00000JYJD1AAP",
    "0032u00000ah3grAAA",
    "0032u00000YEFiVAAX",
    "0032u00000XCznBAAT",
    "0032u00000YEHyiAAH",
    "0032u00000DpTIuAAN",
    "0032u00000bGYd3AAG",
    "0032u00000YFdEiAAL",
    "0032u00000Zb1KyAAJ",
    "0032u00000aGlV0AAK",
    "0032u00000FBJJbAAP",
    "0032u00000YGZ9UAAX",
    "0032u00000aeAR1AAM",
    "0032u00000ENlvHAAT",
    "0032u00000YFBzkAAH",
    "0032u00000YFqctAAD",
    "0032u00000FDJLYAA5",
    "0032u00000aGaV5AAK",
    "0032u00000Ht4I8AAJ",
    "0032u00000DpK66AAF",
    "0032u00000DpyINAAZ",
    "0032u00000DpT0NAAV",
    "0032u00000YGetkAAD",
    "0032u00000ENx8BAAT",
    "0032u00000aGyYRAA0",
    "0032u00000KXuJxAAL",
    "0032u00000agSQNAA2",
    "0032u00000aI1O5AAK",
    "0032u00000ahaBmAAI",
    "0032u00000bGIQ6AAO",
    "0032u00000DpsiQAAR",
    "0032u00000aI0CHAA0",
    "0032u00000F9VVbAAN",
    "0032u00000DpFhSAAV",
    "0032u00000ag2t7AAA",
    "0032u00000ENkpDAAT",
    "0032u00000aee9eAAA",
    "0032u00000WX58KAAT",
    "0032u00000aGY97AAG",
    "0032u00000F80O5AAJ",
    "0032u00000FATHyAAP",
    "0032u00000DpTA7AAN",
    "0032u00000afYXnAAM",
    "0032u00000aeARGAA2",
    "0032u00000ZZmBiAAL",
    "0032u00000aeAEtAAM",
    "0032u00000aFmGPAA0",
    "0032u00000VLPdRAAX",
    "0032u00000DpnfJAAR",
    "0032u00000ZZ897AAD",
    "0032u00000aFdKjAAK",
    "0032u00000DptuhAAB",
    "0032u00000aeeZSAAY",
    "0032u00000Za9K4AAJ",
    "0032u00000Zb0hDAAR",
    "0032u00000ahtYuAAI",
    "0032u00000EdGFtAAN",
    "0032u00000DpY7yAAF",
    "0032u00000agsQWAAY",
    "0032u00000DplYRAAZ",
    "0032u00000FCE0PAAX",
    "0032u00000DpYBbAAN",
    "0032u00000EdYuiAAF",
    "0032u00000WZeUcAAL",
    "0032u00000W0XW6AAN",
    "0032u00000ZayUgAAJ",
    "0032u00000ENquwAAD",
    "0032u00000F9NEuAAN",
    "0032u00000ahfxpAAA",
    "0032u00000aFIjbAAG",
    "0032u00000Zb0tZAAR",
    "0032u00000EO2OcAAL",
    "0032u00000FBXmSAAX",
    "0032u00000UNS4pAAH",
    "0032u00000bGtwYAAS",
    "0032u00000Dq18qAAB",
    "0032u00000aH3wyAAC",
    "0032u00000DpKe1AAF",
    "0032u00000ahrcNAAQ",
    "0032u00000ENsKRAA1",
    "0032u00000DpmQ6AAJ",
    "0032u00000DpaEFAAZ",
    "0032u00000Ed6ZgAAJ",
    "0032u00000DpUxSAAV",
    "0032u00000EabcOAAR",
    "0032u00000ZcKBYAA3",
    "0032u00000ZZ6VLAA1",
    "0032u00000FBTZ3AAP",
    "0032u00000DpHl3AAF",
    "0032u00000FBLHbAAP",
    "0032u00000DpU0RAAV",
    "0032u00000DpzS1AAJ",
    "0032u00000aFIw7AAG",
    "0032u00000DpIUjAAN",
    "0032u00000DpsgaAAB",
    "0032u00000ae5aMAAQ",
    "0032u00000Dq2MfAAJ",
    "0032u00000ENpLpAAL",
    "0032u00000F8ReFAAV",
    "0032u00000DpVscAAF",
    "0032u00000DpuyEAAR",
    "0032u00000aem7HAAQ",
  ]

  for (let i = 0; i < contactKeys.length; i++) {
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
