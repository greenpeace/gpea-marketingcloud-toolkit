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
    "tw-lead_conversion-automd-climate-climate_emergency",
    "tw-lead_conversion-automd-climate-climate_vote",
    "tw-lead_conversion-automd-climate-energy_bulkuser",
    "tw-lead_conversion-automd-climate-government_set_carbon_price",
    "tw-lead_conversion-automd-climate-greenhouse",
    "tw-lead_conversion-automd-climate-Greta_webinar",
    "tw-lead_conversion-automd-climate-re10x10",
    "tw-lead_conversion-automd-forests-global_forests",
    "tw-lead_conversion-automd-general-dd_webinar_donor",
    "tw-lead_conversion-automd-general-dd_webinar_donor_test",
    "tw-lead_conversion-automd-general-dd_webinar_supporter",
    "tw-lead_conversion-automd-general-world_meatless_day",
    "tw-lead_conversion-automd-oceans-cwf_coastal_water_fisheries",
    "tw-lead_conversion-automd-oceans-cwf_protector",
    "tw-lead_conversion-automd-oceans-cwf_seafood",
    "tw-lead_conversion-automd-oceans-dwf_distant_water_fisheries",
    "tw-lead_conversion-automd-oceans-oceansday_webinar",
    "tw-lead_conversion-automd-oceans-oceanssancturies",
    "tw-lead_conversion-automd-plastics-plasticfree_alliance",
    "tw-lead_conversion-automd-plastics-plastics_policy",
    "tw-lead_conversion-automd-plastics-plastics_retailer",
    "tw-lead_conversion-automd-plastics-seveneleven",
    "tw-auto_greennews-automd-biweekly",
    "tw-reactivation-automd-lapsed_donors",
    "tw-oneoff_conversion-automd-sg2rg"
  ]

  let mcJourney = mcbase.factory('Journey')

  // let stat = await mcJourney.getJourneyStatByName("hk-welcome_new_donor-automd-welcome_new_donor")
  // delete stat.journey
  // console.log('stat', stat)

  for (let i = 0; i < journeyToPause.length; i++) {
    let journeyName = journeyToPause[i];
    let res = await mcJourney.findByName(journeyName)
    let journeyId = _.get(res, "items.0.id")

    // // pause
    // logger.debug(`Now pausing ${journeyName}`)
    // res = await mcJourney.pause(journeyId, {
    //   ExtendWaitEndDates: true,
    //   PausedDays: 14,
    //   GuardrailAction: "Resume",
    //   RetainContactInjectionWhileJourneyPaused: true,
    //   AllVersions: true
    // })
    // logger.info(`${journeyName} pause response ${JSON.stringify(res)}`)

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
