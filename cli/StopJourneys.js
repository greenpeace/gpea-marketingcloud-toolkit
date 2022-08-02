const MCBase = require('../models/MarketingCloud/Base')
const logger = require('../lib/logger');
const _ = require("lodash")
const Notifier = require('../lib/Notifier.js')

async function main () {
  let mcbase = new MCBase({
    clientId: process.env.MC_HK_CLIENTID,
    clientSecret: process.env.MC_HK_CLIENTSECRET,
    subDomain: process.env.MC_HK_SUBDOMAIN,
    accountId: process.env.MC_HK_ACCOUNTID,
  })
  await mcbase.doAuth()
  let mcJourney = mcbase.factory('Journey')

  let journeyNamesToStop = [
    'hk-20121018-lead_conversion-manual-create-call-case',
    'hk-20220120-cnywebinar-reminder-single-sends',
    'hk-20220128-adhoc-polarbearday-webinar-tfr',
    'hk-20220406-adhoc-climate-earthday-webinar',
    'hk-20220406-adhoc-climate-earthday-webinar-new-createdByAdmin',
    'hk-20220602-sms-plasticfree-marketplace-workshop-confrimation-single-sends',
    'hk-annual_upgrade-adhoc-20220127',
    'hk-lead_conversion-adhoc-20220118-recycle_call_cases',
    'hk-middle_donor_upgrade-adhoc-20220117',
    'hk-sms-adhoc-20220406-sa-tax-oneclick-creditcard-english',
    'hk-sms-adhoc-20220408-sa-tax-directdebit',
    'hk-sms-adhoc-20220408-sa-tax-directdebit-english',
    'hk-sms-adhoc-20220424_earthday_pledging_donation_ask',
    'hk-sms-adhoc-20220501_quarterly_greenimpact_news-chi',
    'hk-sms-adhoc-20220501_quarterly_greenimpact_news-eng',
    'hk-sms-adhoc-20220523-donor_lantau_movie_invitation',
    'hk-sms-adhoc-20220527-lantau-documentary-sms',
    'hk-sms-adhoc-20220602-lantau-documentary-english-donor-invitationsms',
    'hk-sms-adhoc-20220605-lantau-documentary-sms-second-appeal',
    'hk-sms-adhoc-20220608-world_ocean_day_donation-sms',
    'hk-transactional-adhoc-20220617-new_oneoff_by_donor-leftover_notifications',
    'hk-transactional-adhoc-rg_cancellation_0032u00000VKDAUAA5',
    'New Journey - July 8 2022 at 4.23 PM',
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
