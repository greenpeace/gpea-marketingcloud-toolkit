const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const fs = require('fs')
require('dotenv').config()

/**
 * What this script does:
 *
 * 1. Download the Journey JSON settings 
 * 2. Save a a json file
 */
async function main() {
  // EDIT HERE
  const srcJourneyName = "kr-debit_fail-automd-weekly_reminder"
  const market = "kr"
  // END EDIT

  // fetch src
  let mcbase = new MCBase({ market })
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let r = await mcJourney.findByName(srcJourneyName, { mostRecentVersionOnly: true })
  let destJ = _.get(r, 'items.0')
  if (!destJ) {
    throw "Cannot find the destination journey"
  }
  logger.info(`Source journey ${destJ.name} version:${destJ.version} status:${destJ.status}`)
  
  // write to file
  console.log(`write to file ${srcJourneyName}.json`)
  fs.writeFileSync(srcJourneyName+'.json', JSON.stringify(destJ,null,2))
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
