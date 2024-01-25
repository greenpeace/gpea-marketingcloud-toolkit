const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const fs = require('fs')
require('dotenv').config()

/**
 * What this script does:
 *
 * 1. Download Journey Settings from src Journey
 * 2. Replace the dest Journey with src Journey settings.
 * Note: You have to create an empty dest journey first.
 *
 */
async function main() {
  // EDIT HERE
  const srcJourneyName = "tw-debit_fail-automd-weekly_reminder"
  const srcMarket = "tw"
  const destJourneyName = "kr-debit_fail-automd-weekly_reminder"
  const destMarket = "kr"

  // fetch src
  let mcbase = new MCBase({ market:srcMarket })
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let srcJ = await mcJB.loadSrcJourneyName(srcJourneyName)
  logger.info(`Source journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)

  let nextJ = _.pick(srcJ, ['activities', 'triggers'])
  
  console.log(`write to file ${srcJourneyName}`)
  fs.writeFileSync(srcJourneyName, JSON.stringify(srcJ,null,2))

  // Read the dest journey
  mcbase = new MCBase({ market:destMarket })
  await mcbase.doAuth()
  mcJourney = mcbase.factory('Journey')
  mcJB = mcbase.factory('JourneyBuilder')

  let r = await mcJourney.findByName(destJourneyName, { mostRecentVersionOnly: true }) // EDIT HERE
  let destJ = _.get(r, 'items.0')
  if (!destJ) {
    throw "Cannot find the destination journey"
  }

  // replace the dest content with updated content
  Object.assign(destJ, nextJ)

  // console.log('destJ', JSON.stringify(destJ, null, 4));
  logger.info(`Updating journey ${destJ.name} version:${destJ.version} status:${destJ.status}`)
  r = await mcJourney.updateJourney(destJ)
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
