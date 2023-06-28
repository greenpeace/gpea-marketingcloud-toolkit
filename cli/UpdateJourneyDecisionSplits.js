const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
require('dotenv').config()

/**
 * To update the journey criteria based on the pre-defined criteria.
 * For all the supported criteria, @see models/MarketingCloud/JourneyBuilder/DecisionSplitCriteria.js
 */
async function main() {
  // EDIT HERE
  const srcJourneyName = "hk-comms-adhoc-20230522-notice_of_billing_date_modification-chinese"
  const destJourneyName = srcJourneyName
  // const destJourneyName = "up-lead_conversion-dev-general-elm"
  const market = "HK"
  const replaceWaitToMinutes = false

  let mcbase = new MCBase({ market })

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let srcJ = await mcJB.loadSrcJourneyName(srcJourneyName)
  logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)
  // console.log("srcJ", JSON.stringify(srcJ, null, 4));

  // init criteria
  mcJB.setMarket(market)
  mcJB.patchDecisionSplitCriteria()
  mcJB.generateActivityWaitMap()

  // path the criteria
  mcJB.patchJourney()

  if (replaceWaitToMinutes) {
    mcJB.patchJourneyWaitTimeToMinute()
  }

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
