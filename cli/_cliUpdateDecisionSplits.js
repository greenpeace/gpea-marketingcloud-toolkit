const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')
const format = require('date-fns/format')

// const {TW_JOURNEY_DECISION_SPLIT_RULES, HK_JOURNEY_DECISION_SPLIT_RULES} = require('../constants/JourneyDecisionSplitCriteria.js')

async function main() {
  let mcbase = new MCBase({
    clientId: process.env.MC_HK_CLIENTID,
    clientSecret: process.env.MC_HK_CLIENTSECRET,
    subDomain: process.env.MC_HK_SUBDOMAIN,
    accountId: process.env.MC_HK_ACCOUNTID,
  })
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')
  let mcJB = mcbase.factory('JourneyBuilder')

  let srcJ = await mcJB.loadSrcJourneyName('hk-debit_fail-automd-direct_debit_setup_fail')
  logger.info(`Read journey ${srcJ.name} version:${srcJ.version} status:${srcJ.status}`)
  // console.log("srcJ", JSON.stringify(srcJ, null, 4));

  // let srcJ = await mcJB.loadSrcJourneyName('up-lead_conversion-automd-oceans-oceanssancturies-20220610')
  // let srcJ = await mcJB.loadSrcJourneyName('tw-welcome_new_donor-automd-for_rg_status_delay_population-20220311')
  // let srcJ = await mcJB.loadSrcJourneyName('tw-oneoff_conversion-automd-sg2rg')
  // let srcJ = await mcJB.loadSrcJourneyName('tw-lead_conversion-adhoc-20220704-plastics-plasticanimal_leftover')
  mcJB.setMarket("hk")
  mcJB.pathDecisionSplitCriteria()
  mcJB.generateActivityWaitMap()
  let nextJ = mcJB.pathJourney()

  // find the dest journey
  r = await mcJourney.findByName('hk-debit_fail-automd-direct_debit_setup_fail', {mostRecentVersionOnly: true})
  // r = await mcJourney.findByName('tw-lead_conversion-automd-climate-20220606-mitigate_climatechange', {mostRecentVersionOnly: true})
  let destJ = _.get(r, 'items.0')
  if (!destJ) {
    throw "Cannot find the destination journey"
  }
  // console.log('destJ', destJ)

  // replace the dest content with updated content
  let journeyDetailsToPut = Object.assign(destJ, nextJ)
  // console.log("journeyDetailsToPut", JSON.stringify(journeyDetailsToPut, null, 4));

  // console.log('destJ', JSON.stringify(destJ, null, 4));
  logger.info(`Updating journey ${destJ.name} version:${destJ.version} status:${destJ.status}`)
  r = await mcJourney.updateJourney(destJ)
  // console.log('Request Result')
  // // console.log('Update Result:', r)
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
