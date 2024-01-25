const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const fs = require('fs')
require('dotenv').config()

/**
 * What this script does:
 *
 * 1. To update the journey criteria based on the pre-defined criteria.
 * For all the supported criteria, @see models/MarketingCloud/JourneyBuilder/DecisionSplitCriteria.js
 * 2. Replace all the wait period to X minutes. Controled by `replaceWaitToMinutes` variable.
 * 3. Patch the CREATE_CONTACTJOURNEY and END_CONTACTJOURNEY activities.
 *
 * TODO:
 * 4. Patch SMS activities with black out window 8am-8pm
 * 5. Check the Call Case activities with all the necessary fields.
 */
async function main() {
  // EDIT HERE
  const srcJourneyName = "kr-debit_fail-automd-weekly_reminder"
  const destJourneyName = srcJourneyName
  // const destJourneyName = "up-lead_conversion-automd-oceans-oceanssancturies-dest-20230801"
  const market = "kr"
  const replaceWaitToMinutes = false

  let mcbase = new MCBase({ market })

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let srcJ = await mcJB.loadSrcJourneyName(srcJourneyName)
  logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)
  // fs.writeFileSync(srcJourneyName, JSON.stringify(srcJ,null,2))

  // init criteria
  mcJB.setMarket(market)
  mcJB.patchDecisionSplitCriteria()
  mcJB.generateActivityWaitMap()

  // path the criteria
  mcJB.patchJourney()

  if (replaceWaitToMinutes) {
    mcJB.patchJourneyWaitTimeToMinute()
  }

  // path contact journeys (contact audiences)
  mcJB.patchCreateContactJourneyActivity()
  mcJB.patchEndContactJourneyActivity()


  let nextJ = mcJB.nextJ

  // Read the dest journey
  r = await mcJourney.findByName(destJourneyName, { mostRecentVersionOnly: true }) // EDIT HERE
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