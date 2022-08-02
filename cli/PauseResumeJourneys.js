const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main() {
  let mcbase = new MCBase({
    clientId: process.env.MC_TW_CLIENTID,
    clientSecret: process.env.MC_TW_CLIENTSECRET,
    subDomain: process.env.MC_TW_SUBDOMAIN,
    accountId: process.env.MC_TW_ACCOUNTID,
  })
  await mcbase.doAuth()


  let journeyToPause = [
    "tw-lead_conversion-adhoc-20210721-oceans-cwf_protector_under_age_supporters",
    "tw-lead_conversion-adhoc-oceans-cwf_seafood_convert_from_leads",
    "tw-lead_conversion-automd-arctic-savethearctic",
    "tw-lead_conversion-automd-climate-climate_emergency"
  ]

  let mcJourney = mcbase.factory('Journey')

  for (let i = 0; i < journeyToPause.length; i++) {
    let journeyName = journeyToPause[i];
    let res = await mcJourney.findByName(journeyName)
    let journeyId = _.get(res, "items.0.id")

    // pause
    logger.debug(`Now pausing ${journeyName}`)
    res = await mcJourney.pause(journeyId, {
      ExtendWaitEndDates: true,
      PausedDays: 14,
      GuardrailAction: "Resume",
      RetainContactInjectionWhileJourneyPaused: true,
      AllVersions: true
    })
    logger.info(`${journeyName} pause response ${JSON.stringify(res)}`)

    // resume
    logger.debug(`Now resuming ${journeyName}`)
    res = await mcJourney.resume(journeyId, {})
    logger.info(`${journeyName} resume response ${JSON.stringify(res)}`)
  }
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
