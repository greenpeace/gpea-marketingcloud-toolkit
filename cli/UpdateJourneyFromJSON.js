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
  const jDefPath = "kr-debit_fail-automd-weekly_reminder.json"
  const targetJourneyName = "kr-debit_fail-automd-weekly_reminder"
  const market = "kr"
  // END EDIT

  const fileContent = fs.readFileSync(jDefPath, 'utf-8');
  const jDef = JSON.parse(fileContent);

  // fetch src
  let mcbase = new MCBase({ market })
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let r = await mcJourney.findByName(targetJourneyName, { mostRecentVersionOnly: true })
  let destJ = _.get(r, 'items.0')
  if (!destJ) {
    throw "Cannot find the destination journey"
  }
  logger.info(`Source journey ${destJ.name} version:${destJ.version} status:${destJ.status}`)
  
  // replace the dest content with updated content
  let nextJ = _.pick(jDef, ['activities', 'triggers'])
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
