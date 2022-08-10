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
  const srcJourneyName = "tw-special_appeal-adhoc-20220802-general_rg_donors"
  const destJourneyName = "tw-special_appeal-adhoc-20220802-general_rg_donors"
  const market = "TW"

  let mcbase = new MCBase({market})

  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let srcJ = await mcJB.loadSrcJourneyName(srcJourneyName)
  logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)
  // console.log("srcJ", JSON.stringify(srcJ, null, 4));

  // init criteria
  mcJB.setMarket(market)
  mcJB.pathDecisionSplitCriteria()
  mcJB.generateActivityWaitMap()

  // path the criteria
  let nextJ = mcJB.pathJourney()

  // Read the dest journey
  r = await mcJourney.findByName(destJourneyName, {mostRecentVersionOnly: true}) // EDIT HERE
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
