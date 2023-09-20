const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let market = "TW"

  let mcbase = new MCBase({market})
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')

  let journeyNamesToStop = [
    'tw-sms-adhoc-20230502-donor_paydate_change-sms',
    'tw-sms-adhoc-tw-20230202-activist-plastic_screening_donor_event-sms',
    'tw-sms-adhoc-tw-20230412-Donor-Event-Annual-reception-sms',
    'tw-sms-adhoc-tw-20230421-GF',
    'tw-sms-adhoc-tw-20230518-protect_ocean_law-sms',
    'tw-sms-adhoc-tw-20230621-Climate-Event-Invitation-sms',
    'tw-sms-adhoc-tw-20230630-DFR_Fundraising-sms',
    'tw-sms-adhoc-tw-20230704-ebull-activist-climate_donor_event-sms',
    'tw-sms-adhoc-tw-20230726-plastic_DIY_invitation-sms',
    'tw-sms-adhoc-tw-20230804-ebull-activist-plastic_donor_event_confirm_am',
    'tw-sms-adhoc-tw-20230804-ebull-activist-plastic_donor_event_confirm_pm',
    'tw-sms-adhoc-tw-20230824-ebull-activist-plastic_donor_event_confirm_am',
    'tw-sms-adhoc-tw-20230824-ebull-activist-plastic_donor_event_confirm_pm',
    'tw-sms-adhoc-tw-special_appeal-sms-20230827_gpt-one_off-sms',
    'tw-sms-adhoc-tw-special_appeal-sms-20230908_climate-one_off',
    'up-transactional-automd-new_oneoff_by_donor'
  ]

  for (let i = 0; i < journeyNamesToStop.length; i++) {
    const jName = journeyNamesToStop[i];

    let r = await mcJourney.findByName(jName, {mostRecentVersionOnly: false})

    // let jDefinitionId = _.get(journey, 'items.0.definitionId')

    if (r.items.length) {
      let publishedJourneyVersion = r.items.find(oneVerJourney => {
        return oneVerJourney.status==='Published'
      })

      if ( !publishedJourneyVersion) {
        console.info(`${jName} doesn't have active an version. Skip.`)
      } else {
        // console.log(publishedJourneyVersion)
        let jId = _.get(publishedJourneyVersion, 'id')
        let version = _.get(publishedJourneyVersion, 'version')
        let stopResult = await mcJourney.stop(jId, {versionNumber: version})
        console.log(`${jName} v${version} is going to stop.`, 'result', stopResult)
      }
    } else {
      console.warn(`${jName} not found`)
    }
  }
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
